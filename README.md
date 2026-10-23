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

