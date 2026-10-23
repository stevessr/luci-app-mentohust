# luci-app-mentohust

[MentoHUST](https://code.google.com/archive/p/mentohust/) 是一个支持 Windows、Linux、Mac OS 下锐捷认证的程序（附带支持赛尔认证）

## How to build

- Enter in your openwrt dir

- Openwrt official SnapShots

  ```shell
  git clone https://github.com/sbwml/luci-app-mentohust package/mentohust
  make menuconfig # choose LUCI -> Applications -> luci-app-mentohust
  make V=s
  ```

--------------

## 通过 IPK 安装包安装

#### 前往 https://github.com/sbwml/luci-app-mentohust/releases/tag/v0.3.1

--------------

## 认证文件上传

在 LuCI 的 **服务 → MentoHUST** 页面选择并上传 `8021x.exe`、`SuConfig.dat` 或 `W32N55.dll`。文件会保存到 `/etc/mentohust/`；上传同名文件会先提示确认再覆盖。其他文件名会被拒绝。


![10 0 0 1_cgi-bin_luci_admin_services_mentohust](https://user-images.githubusercontent.com/16485166/219599380-2a433cf3-e035-414d-a402-bea587d3a755.png)


## IPv6（EAP 认证后）

MentoHUST 使用 IEEE 802.1X/EAPOL 完成二层认证。EAPOL 不依赖 IPv4 或 IPv6，
原有锐捷/赛尔兼容报文中的四字节地址仍然是 IPv4 字段，**不能**直接扩展成 16 字节。

此版本提供**可选**的 IPv6 联动：EAP 认证最终成功后，触发 OpenWrt 的
`ifup <IPv6 网络接口>`，由 netifd / odhcp6c 按路由通告（RA）和 DHCPv6
获取 IPv6 地址、DNS 和可用的前缀委派（PD）。
禁用该功能（不填写“IPv6 网络接口”）不改变现有 IPv4 认证。

先在“网络 → 接口”创建 DHCPv6 客户端接口（例如 `wan6`），或以 UCI 配置：

```sh
# 下例 eth0 只是占位符：换成 MentoHUST 实际认证使用的物理设备/VLAN。
uci -q get network.wan6 >/dev/null || uci set network.wan6='interface'
uci set network.wan6.device='eth0'
uci set network.wan6.proto='dhcpv6'
uci set network.wan6.reqaddress='try'
uci set network.wan6.reqprefix='auto'
uci set network.wan6.auto='0'  # 避免认证之前自动启动
uci commit network

uci set mentohust.config.ipv6_network='wan6'
uci commit mentohust
/etc/init.d/mentohust restart
```

需要安装 OpenWrt 的 `odhcp6c`（LuCI 图形化配置通常还需 `luci-proto-ipv6`）。
当上游只提供 RA/SLAAC 而没有 DHCPv6 地址分配时，`odhcp6c` 仍可通过 RA
完成地址配置。前缀委派必须由上游实际提供；如果校园网只下发单个 /64，
不会因为本选项自动获得可路由的 LAN 前缀，需要另外规划 NDP relay 或其他方案。

`ipv6_network` 是 **/etc/config/network 的逻辑接口名**，不是 `eth0`
之类的物理设备名。为避免影响无关接口，钩子只允许启动 `proto=dhcpv6`
的网络，且只接受安全的 UCI 接口名称，不会执行用户提供的 shell 命令。

调试：`logread -e mentohust`、`ifstatus wan6`、`ip -6 addr`、
`ip -6 route`、`tcpdump -ni eth0 'icmp6 or udp port 546 or udp port 547'`。
是否可获得 IPv6 还取决于学校接入交换机、RA/DHCPv6 服务和上游网络策略。
