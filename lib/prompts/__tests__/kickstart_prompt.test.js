const _ = require('lodash');
const inquirer = require('inquirer');
const path = require('path');
const sinon = require('sinon');

const testUtil = require('../../../test/util.js');

const initCwd = process.cwd();

let GlobalModulePrompt;
let KickstartPrompt;
let NPMModulePrompt;
let prototype;

beforeEach(() => {
	jest.setTimeout(30000);

	testUtil.copyTempTheme({
		namespace: 'kickstart_prompt',
	});

	GlobalModulePrompt = require('../global_module_prompt.js');
	KickstartPrompt = require('../kickstart_prompt.js');
	NPMModulePrompt = require('../npm_module_prompt.js');

	prototype = _.create(KickstartPrompt.prototype);
});

afterEach(() => {
	testUtil.cleanTempTheme('base-theme', '7.0', 'kickstart_prompt', initCwd);
});

it('constructor should pass arguments to init', () => {
	const init = KickstartPrompt.prototype.init;

	KickstartPrompt.prototype.init = sinon.spy();

	new KickstartPrompt(_.noop);

	expect(KickstartPrompt.prototype.init.calledWith(_.noop)).toBe(true);

	KickstartPrompt.prototype.init = init;
});

it('init should should assign callback as done property, set themeConfig, and invoke prompting', () => {
	prototype._promptThemeSource = sinon.spy();

	const themeConfig = {
		version: '7.0',
	};

	prototype.init(
		{
			themeConfig: themeConfig,
		},
		_.noop
	);

	expect(prototype._promptThemeSource.calledOnce).toBe(true);
	expect(prototype.themeConfig).toEqual(themeConfig);
	expect(prototype.done).toBe(_.noop);
});

it('_afterPromptModule should pass answers to done prop or invoke _installTempModule', () => {
	const answers = {
		modules: {
			'some-theme': {},
		},
	};

	prototype._installTempModule = sinon.spy();
	prototype.done = sinon.spy();

	prototype._afterPromptModule(answers);

	expect(prototype._installTempModule.notCalled).toBe(true);
	expect(prototype.done.calledWith(answers)).toBe(true);

	answers.module = 'some-theme';

	prototype._afterPromptModule(answers);

	expect(prototype._installTempModule.calledWith('some-theme')).toBe(true);

	prototype._installTempModule.getCall(0).args[1]();

	expect(prototype.done.getCall(1).calledWith(answers)).toBe(true);
});

it('_afterPromptModule should set modulePath property of answers object if realPath exists in pkg', () => {
	const answers = {
		module: 'some-theme',
		modules: {
			'some-theme': {
				realPath: '/path/to/some-theme',
			},
		},
	};

	prototype._installTempModule = sinon.spy();
	prototype.done = sinon.spy();

	prototype._afterPromptModule(answers);

	expect(prototype._installTempModule.notCalled).toBe(true);
	expect(prototype.done.calledWith(answers)).toBe(true);
	expect(answers.modulePath).toBe(path.join('/path/to/some-theme/src'));
});

it('_afterPromptThemeSource should invoke correct prompt based on themeSource answer passing _afterPromptModule as callback', () => {
	let init = NPMModulePrompt.prototype.init;

	NPMModulePrompt.prototype.init = sinon.spy();

	const answers = {
		themeSource: 'npm',
	};

	prototype._afterPromptThemeSource(answers);

	expect(NPMModulePrompt.prototype.init.calledOnce).toBe(true);

	NPMModulePrompt.prototype.init = init;

	init = GlobalModulePrompt.prototype.init;

	GlobalModulePrompt.prototype.init = sinon.spy();

	answers.themeSource = 'global';

	prototype._afterPromptThemeSource(answers);

	expect(GlobalModulePrompt.prototype.init.calledOnce).toBe(true);

	GlobalModulePrompt.prototype.init = init;
});

it('_installTempModule should pass', done => {
	const name = 'a-theme-name-that-should-never-exist';

	prototype._installTempModule(
		name,
		function(err) {
			const command =
				'npm install --prefix ' +
				path.join(process.cwd(), '.temp_node_modules') +
				' ' +
				name;

			if (err.cmd) {
				expect(err.cmd.indexOf(command) > -1).toBe(true);
			}

			done();
		},
		true
	);
});

it('_promptThemeSource should pass', () => {
	const prompt = inquirer.prompt;

	inquirer.prompt = sinon.spy();
	prototype._afterPromptThemeSource = sinon.spy();

	prototype._promptThemeSource();

	const args = inquirer.prompt.getCall(0).args;

	expect(args[0][0].name).toBe('themeSource');

	args[1]('arguments');

	expect(prototype._afterPromptThemeSource.calledWith('arguments')).toBe(
		true
	);

	inquirer.prompt = prompt;
});
