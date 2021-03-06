/**
 * @author mrdoob / http://mrdoob.com/
 */

let Editor = function () {
	this.DEFAULT_CAMERA = new THREE.PerspectiveCamera(50, 1, 0.1, 10000);
	this.DEFAULT_CAMERA.name = 'Camera';
	this.DEFAULT_CAMERA.position.set(20, 10, 20);
	this.DEFAULT_CAMERA.lookAt(new THREE.Vector3());

	let Signal = signals.Signal;

	this.signals = {
		// script
		//editScript: new Signal(),

		// player
		startPlayer: new Signal(),
		stopPlayer: new Signal(),

		// vr
		enterVR: new Signal(),

		enteredVR: new Signal(),
		exitedVR: new Signal(),

		// notifications
		editorCleared: new Signal(),

		savingStarted: new Signal(),
		savingFinished: new Signal(),

		themeChanged: new Signal(),

		transformModeChanged: new Signal(),
		snapChanged: new Signal(),
		spaceChanged: new Signal(),
		rendererChanged: new Signal(),//

		sceneBackgroundChanged: new Signal(),
		sceneFogChanged: new Signal(),
		sceneGraphChanged: new Signal(),

		//cameraChanged: new Signal(),

		geometryChanged: new Signal(),

		objectSelected: new Signal(),
		objectFocused: new Signal(),

		objectAdded: new Signal(),
		objectChanged: new Signal(),
		objectRemoved: new Signal(),

		helperAdded: new Signal(),
		helperRemoved: new Signal(),

		materialChanged: new Signal(),

		scriptAdded: new Signal(),
		scriptChanged: new Signal(),
		scriptRemoved: new Signal(),

		//windowResize: new Signal(),

		showGridChanged: new Signal(),
		refreshSidebarObject3D: new Signal(),
		historyChanged: new Signal()
	};

	this.type = 'Level';

	// Physics config

	Physijs.scripts.worker = '/js/libs/Physijs/physijs_worker.js';
	Physijs.scripts.ammo = '/js/libs/Physijs/examples/js/ammo.js';

	// Editor config

	let name = 'Uranium 235';

	this.config = new Config(name);
	this.history = new History(this);
	this.storage = new Storage(name);
	this.loader = new Loader(this);

	this.camera = this.DEFAULT_CAMERA.clone();

	//this.scene = new THREE.Scene();
	this.scene = new Physijs.Scene();
	this.scene.name = 'Scene';
	this.scene.background = new THREE.Color(0xaaaaaa);

	this.sceneHelpers = new THREE.Scene();

	this.object = {};
	this.geometries = {};
	this.materials = {};
	this.textures = {};
	this.scripts = {};

	this.selected = null;
	this.helpers = {};
};

Editor.prototype = {

	setTheme: function (value) {
        let jstreeDiv = $("#jstree");

        switch (value) {
            case 'css/light.css':
                document.getElementById('GLtheme').href = '../node_modules/golden-layout/src/css/goldenlayout-light-theme.css';
                if (jstreeDiv) jstreeDiv.jstree('set_theme', 'default');
                break;
            case 'css/dark.css':
                document.getElementById('GLtheme').href = '../node_modules/golden-layout/src/css/goldenlayout-dark-theme.css';
                if (jstreeDiv) jstreeDiv.jstree('set_theme', 'default-dark');
                break;
            default:
                break;
        }
		document.getElementById('theme').href = value;
		this.signals.themeChanged.dispatch(value);
	},

	//

	setScene: function (scene) {
		this.scene.uuid = scene.uuid;
		this.scene.name = scene.name;
		if (scene.background !== null)
			this.scene.background = scene.background.clone();
		if (scene.fog !== null)
			this.scene.fog = scene.fog.clone();
		this.scene.userData = JSON.parse(JSON.stringify(scene.userData));
		// avoid render per object
		this.signals.sceneGraphChanged.active = false;
		while (scene.children.length > 0)
			this.addObject(scene.children[0]);
		this.signals.sceneGraphChanged.active = true;
		this.signals.sceneGraphChanged.dispatch();
	},

	//

	addObject: function (object) {
		let scope = this;
		object.traverse(function (child) {
			if (child.geometry !== undefined)
				scope.addGeometry( child.geometry );
			if (child.material !== undefined)
				scope.addMaterial(child.material);
			scope.addHelper(child);
		});
		this.scene.add(object);
		this.signals.objectAdded.dispatch(object);
		this.signals.sceneGraphChanged.dispatch();

	},

	moveObject: function (object, parent, before) {
		if (parent === undefined)
			parent = this.scene;
		parent.add(object);
		// sort children array
		if (before !== undefined) {
			let index = parent.children.indexOf(before);
			parent.children.splice(index, 0, object);
			parent.children.pop();
		}
		this.signals.sceneGraphChanged.dispatch();
	},

	nameObject: function (object, name) {
		object.name = name;
		this.signals.sceneGraphChanged.dispatch();
	},

	removeObject: function (object) {
		if (object.parent === null)
			return ; // avoid deleting the camera or scene
		let scope = this;
		object.traverse(function (child) {
			scope.removeHelper(child);
		});
		object.parent.remove(object);
		this.signals.objectRemoved.dispatch( object );
		this.signals.sceneGraphChanged.dispatch();
	},

	addGeometry: function (geometry) {
		this.geometries[geometry.uuid] = geometry;
	},

	setGeometryName: function (geometry, name) {
		geometry.name = name;
		this.signals.sceneGraphChanged.dispatch();
	},

	addMaterial: function (material) {
		this.materials[material.uuid] = material;
	},

	setMaterialName: function (material, name) {
		material.name = name;
		this.signals.sceneGraphChanged.dispatch();
	},

	addTexture: function (texture) {
		this.textures[texture.uuid] = texture;
	},

	//

	addHelper: function () {
		let geometry = new THREE.SphereBufferGeometry( 2, 4, 2 );
		let material = new THREE.MeshBasicMaterial( { color: 0xff0000, visible: false } );
		return function (object) {
			let helper;
			if (object instanceof THREE.Camera)
				helper = new THREE.CameraHelper(object, 1);
			else if (object instanceof THREE.PointLight)
				helper = new THREE.PointLightHelper(object, 1);
			else if (object instanceof THREE.DirectionalLight)
				helper = new THREE.DirectionalLightHelper(object, 1);
			else if (object instanceof THREE.SpotLight)
				helper = new THREE.SpotLightHelper(object, 1);
			else if (object instanceof THREE.HemisphereLight)
				helper = new THREE.HemisphereLightHelper(object, 1);
			else if (object instanceof THREE.SkinnedMesh)
				helper = new THREE.SkeletonHelper(object);
			else
				// no helper for this object type
				return;
			let picker = new THREE.Mesh(geometry, material);
			picker.name = 'picker';
			picker.userData.object = object;
			helper.add(picker);
			this.sceneHelpers.add(helper);
			this.helpers[object.id] = helper;
			this.signals.helperAdded.dispatch(helper);
		};
	}(),

	removeHelper: function (object) {
		if (this.helpers[object.id] !== undefined) {
			let helper = this.helpers[object.id];
			helper.parent.remove(helper);
			delete this.helpers[object.id];
			this.signals.helperRemoved.dispatch(helper);
		}
	},

	//

	addScript: function (object, script) {
		if (this.scripts[object.uuid] === undefined)
			this.scripts[object.uuid] = [];
		this.scripts[object.uuid].push(script);
		this.signals.scriptAdded.dispatch(script);
	},

	removeScript: function (object, script) {
		if (this.scripts[object.uuid] === undefined)
			return ;
		let index = this.scripts[object.uuid].indexOf(script);
		if (index !== - 1)
			this.scripts[object.uuid].splice(index, 1);
		this.signals.scriptRemoved.dispatch(script);
	},

	getObjectMaterial: function (object, slot) {
		let material = object.material;
		if (Array.isArray(material))
			material = material[slot];
		return material;
	},

	setObjectMaterial: function (object, slot, newMaterial) {
		if (Array.isArray(object.material))
			object.material[slot] = newMaterial;
		else
			object.material = newMaterial;
	},

	//

	select: function (object) {
		if (this.selected === object)
			return ;
		let uuid = null;
		if (object !== null)
			uuid = object.uuid;
		this.selected = object;
		this.config.setKey('selected', uuid);
		this.signals.objectSelected.dispatch(object);
	},

	selectById: function (id) {
		if (id === this.camera.id) {
			this.select(this.camera);
			return ;
		}
		this.select(this.scene.getObjectById(id, true));
	},

	selectByUuid: function (uuid) {
		let scope = this;
		this.scene.traverse(function (child) {
			if (child.uuid === uuid)
				scope.select(child);
		});
	},

	deselect: function () {
		this.select(null);
	},

	focus: function (object) {
		this.signals.objectFocused.dispatch(object);
	},

	focusById: function (id) {
		this.focus(this.scene.getObjectById(id, true));
	},

	clear: function () {
		this.history.clear();
		this.storage.clear();
		this.camera.copy(this.DEFAULT_CAMERA);
		this.scene.background.setHex(0xaaaaaa);
		this.scene.fog = null;
		let objects = this.scene.children;
		while (objects.length > 0)
			this.removeObject(objects[0]);
		this.geometries = {};
		this.materials = {};
		this.textures = {};
		this.scripts = {};
		this.deselect();
		this.signals.editorCleared.dispatch();
	},

	//

	fromJSON: function (json) {
		if (json.metadata.type !== this.type)
			throw new Error('JSON data is not an editor scene.');
		let loader = new THREE.ObjectLoader();
		// backwards
		if (json.scene === undefined) {
			this.setScene(loader.parse(json));
			return ;
		}
		let camera = loader.parse(json.camera);
		this.camera.copy(camera);
		this.camera.aspect = this.DEFAULT_CAMERA.aspect;
		this.camera.updateProjectionMatrix();
		this.history.fromJSON(json.history);
		this.scripts = json.scripts;
		let test = loader.parse(json.scene);
		this.setScene(loader.parse(json.scene));
	},

	toJSON: function () {
		// scripts clean up
		let scene = this.scene;
		let scripts = this.scripts;
		for (let key in scripts) {
			let script = scripts[key];
			if (script.length === 0 || scene.getObjectByProperty('uuid', key) === undefined)
				delete scripts[key];
		}
		//
		return ({
			metadata: { type: this.type },
			project: {
				gammaInput: this.config.getKey('project/renderer/gammaInput'),
				gammaOutput: this.config.getKey('project/renderer/gammaOutput'),
				shadows: this.config.getKey('project/renderer/shadows'),
				vr: this.config.getKey('project/vr' )
			},
			camera: this.camera.toJSON(),
			scene: this.scene.toJSON(),
			scripts: this.scripts,
			history: this.history.toJSON()
		});
	},

	objectByUuid: function (uuid) {
		return this.scene.getObjectByProperty('uuid', uuid, true);
	},

	execute: function (cmd, optionalName) {
		this.history.execute(cmd, optionalName);
	},

	undo: function () {
		this.history.undo();
	},

	redo: function () {
		this.history.redo();
	}

};
