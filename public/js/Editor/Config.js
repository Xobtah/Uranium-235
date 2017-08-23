/**
 * @author mrdoob / http://mrdoob.com/
 */

let Config = function (name) {
	let storage = {
		'autosave': true,
		'theme': 'css/light.css',
		'project/renderer': 'WebGLRenderer',
		'project/renderer/antialias': true,
		'project/renderer/gammaInput': false,
		'project/renderer/gammaOutput': false,
		'project/renderer/shadows': true,
		'project/vr': false,
		'settings/history': false
	};

	if (window.localStorage[name] === undefined)
		window.localStorage[name] = JSON.stringify(storage);
	else {
		let data = JSON.parse(window.localStorage[name]);

		for (let key in data)
			storage[key] = data[key];
	}

	return ({
		getKey: function (key) {
			return (storage[key]);
		},

		setKey: function () { // key, value, key, value ...
			for (let i = 0, l = arguments.length; i < l; i += 2)
				storage[arguments[i]] = arguments[i + 1];

			window.localStorage[name] = JSON.stringify(storage);

			console.log('[' + /\d\d\:\d\d\:\d\d/.exec(new Date())[0] + ']', 'Saved config to LocalStorage.');
		},

		clear: function () {
			delete window.localStorage[name];
		}
	});
};
