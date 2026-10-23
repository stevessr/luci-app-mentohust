'use strict';
'require form';
'require poll';
'require rpc';
'require tools.widgets as widgets';
'require request';
'require uci';
'require view';

var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

function getServiceStatus() {
	return L.resolveDefault(callServiceList('mentohust'), {}).then(function (res) {
		var isRunning = false;
		try {
			isRunning = res['mentohust']['instances']['mentohust']['running'];
		} catch (e) { }
		return isRunning;
	});
}

function renderStatus(isRunning) {
	var spanTemp = '<em><span style="color:%s"><strong>%s %s</strong></span></em>';
	var renderHTML;
	if (isRunning) {
		renderHTML = spanTemp.format('green', 'MentoHUST', _('RUNNING'));
	} else {
		renderHTML = spanTemp.format('red', 'MentoHUST', _('NOT RUNNING'));
	}

	return renderHTML;
}

var authFileNames = ['8021x.exe', 'SuConfig.dat', 'W32N55.dll'];

function uploadAuthFile(file, status, button) {
	if (!file) {
		status.textContent = _('Choose a file first.');
		return Promise.resolve();
	}

	if (authFileNames.indexOf(file.name) === -1) {
		status.textContent = _('Unsupported filename: %s').format(file.name);
		return Promise.resolve();
	}

	if (!confirm(_('Upload %s to /etc/mentohust? Existing file will be replaced.').format(file.name)))
		return Promise.resolve();

	var data = new FormData();
	data.append('sessionid', L.env.sessionid);
	data.append('filename', '/etc/mentohust/' + file.name);
	data.append('filedata', file);

	button.disabled = true;
	status.textContent = _('Uploading %s...').format(file.name);

	return request.post(`${L.env.cgi_base}/cgi-upload`, data).then(function (response) {
		var result = response.json();
		if (result && result.failure)
			throw new Error(result.message || _('Upload failed.'));

		status.textContent = _('Uploaded %s').format(file.name);
	}).catch(function (error) {
		status.textContent = _('Upload failed: %s').format(error.message);
	}).finally(function () {
		button.disabled = false;
	});
}


return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('mentohust', _('MentoHUST'),
			_('MentoHUST is a program that supports Ruijie authentication on Windows, Linux and Mac OS (with support for Searle authentication).'));

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = function () {
			poll.add(function () {
				return L.resolveDefault(getServiceStatus()).then(function (res) {
					var view = document.getElementById('service_status');
					view.innerHTML = renderStatus(res);
				});
			});

			return E('div', { class: 'cbi-section', id: 'status_bar' }, [
					E('p', { id: 'service_status' }, _('Collecting data...'))
			]);
		}

		s = m.section(form.NamedSection, 'config', 'mentohust');

		o = s.option(form.Flag, 'enable', _('Enable'));
		o.rmempty = false;

		o = s.option(form.Value, 'username', _('Username'));
		o.rmempty = true;

		o = s.option(form.Value, 'password', _('Password'));
		o.rmempty = true;
		
		o = s.option(widgets.DeviceSelect, 'interface',
			_('Network interface'));
		o.filter = function(section_id, value) {
			var dev = this.devices.filter(function(dev) { return dev.getName() == value })[0];
			var excludeDevice = ['docker', 'dummy', 'radio', 'sit', 'teql', 'veth', 'ztly'];
			return (dev && dev.getName() != null && !excludeDevice.some(prefix => dev.getName().startsWith(prefix)));
		}
		o.rmempty = false;

		o = s.option(form.Value, 'ipaddr', _('IP address'),
			_('Leave blank or set 0.0.0.0 to use local IP (DHCP)'));
		o.default = '0.0.0.0';
		o.rmempty = true;

		o = s.option(form.Value, 'gateway', _('Gateway'));
		o.default = '0.0.0.0';
		o.rmempty = false;

		o = s.option(form.Value, 'mask', _('Subnet Mask'));
		o.default = '255.255.255.0';
		o.rmempty = false;

		o = s.option(form.Value, 'dns', _('DNS'));
		o.default = '0.0.0.0';
		o.rmempty = true;

		o = s.option(form.Value, 'ping', _('Ping Host'),
			_('Ping host for drop detection, 0.0.0.0 to turn off this feature.'));
		o.default = '0.0.0.0';
		o.rmempty = false;

		// EAPOL has no IP address family. IPv6 is configured separately with netifd.
		o = s.option(form.Value, 'ipv6_network', _('IPv6 network (DHCPv6 / RA)'),
			_('Optional OpenWrt network name (for example wan6, protocol dhcpv6). Start it after EAP authentication succeeds. Configure the network on the same physical device as the authenticated interface.'));
		o.placeholder = 'wan6';
		o.datatype = 'uciname';
		o.rmempty = true;

		o = s.option(form.Value, 'timeout', _('Authentication Timeout (Seconds)'));
		o.default = '8';
		o.rmempty = false;

		o = s.option(form.Value, 'interval', _('Response Interval (Seconds)'));
		o.default = '30';
		o.rmempty = false;

		o = s.option(form.Value, 'wait', _('Await Failure(Seconds)'));
		o.default = '15';
		o.rmempty = false;

		o = s.option(form.Value, 'fail_number', _('Allow Failure Count'),
			_('Default 0, indicating no limit.'));
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.ListValue, 'multicast_address', _('Multicast Address'));
		o.default = '1';
		o.value('0', _('Standard'));
		o.value('1', _('Ruijie'));
		o.value('2', _('Searle'));

		o = s.option(form.ListValue, 'dhcp_mode', _('DHCP Mode'));
		o.default = '1';
		o.value('0', _('None'));
		o.value('1', _('Two-factor authentication'));
		o.value('2', _('After authentication'));
		o.value('3', _('Before authentication'));

		o = s.option(form.Value, 'dhcp_script', _('DHCP Script'),
			_('Default udhcpc -i'));
		o.default = 'udhcpc -i';
		o.rmempty = true;

		o = s.option(form.Value, 'version', _('Client Version Number'),
			_('Default 0.00，indicating compatibility with xrgsu'));
		o.default = '0.00';
		o.rmempty = false;

		o = s.option(form.DummyValue, 'auth_files', _('Authentication files'),
			_('Upload 8021x.exe, SuConfig.dat, or W32N55.dll to /etc/mentohust. Same-name files are replaced.'));
		o.renderWidget = function() {
			var fileInput = E('input', {
				'type': 'file',
				'accept': '.exe,.dat,.dll'
			});
			var status = E('span', { 'class': 'cbi-value-description' });
			var uploadButton;

			uploadButton = E('button', {
				'type': 'button',
				'class': 'btn cbi-button cbi-button-action',
				'click': function() {
					return uploadAuthFile(fileInput.files[0], status, uploadButton);
				}
			}, _('Upload'));

			return E('div', { 'class': 'mentohust-file-upload' }, [ fileInput, uploadButton, status ]);
		};


		return m.render();
	}
});
