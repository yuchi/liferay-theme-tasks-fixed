const _ = require('lodash');
const inquirer = require('inquirer');
const path = require('path');
const sinon = require('sinon');

const testUtil = require('../../../test/util.js');

const assertBoundFunction = testUtil.assertBoundFunction;
const prototypeMethodSpy = new testUtil.PrototypeMethodSpy();

const initCwd = process.cwd();

let ModulePrompt;
let promptUtil;
let themeFinder;
let prototype;

beforeEach(() => {
	testUtil.copyTempTheme({
		namespace: 'module_prompt',
	});

	ModulePrompt = require('../../../lib/prompts/module_prompt.js');
	promptUtil = require('../../../lib/prompts/prompt_util.js');
	themeFinder = require('../../../lib/theme_finder');

	prototype = _.create(ModulePrompt.prototype);
});

afterEach(() => {
	prototypeMethodSpy.flush();

	testUtil.cleanTempTheme('base-theme', '7.0', 'module_prompt', initCwd);
});

it('constructor should pass arguments to init', () => {
	let initSpy = prototypeMethodSpy.add(ModulePrompt.prototype, 'init');

	new ModulePrompt({}, _.noop);

	expect(initSpy.calledWith({}, _.noop)).toBe(true);
});

it('init should assign callback as done property and invoke prompting', () => {
	prototype._prompt = sinon.spy();

	prototype.init(
		{
			modules: 'modules',
			selectedModules: ['module'],
			themelet: true,
		},
		_.noop
	);

	expect(prototype.modules).toBe('modules');
	expect(prototype.selectedModules).toEqual(['module']);
	expect(prototype._prompt.calledOnce).toBe(true);
	expect(prototype.done).toBe(_.noop);
	expect(prototype.themelet).toBe(true);
});

it('_afterPrompt should parse themelet data if themelet is true and pass answers to done', () => {
	prototype.modules = 'modules';
	prototype.done = sinon.spy();
	prototype.themelet = true;

	prototypeMethodSpy
		.add(promptUtil, 'formatThemeletSelection', true)
		.returns({
			addedModules: ['themelet-1'],
		});

	prototype._afterPrompt(
		{
			module: {
				'themelet-1': true,
			},
		},
		['themelet-2']
	);

	expect(
		prototype.done.calledWith({
			addedModules: ['themelet-1'],
			module: {
				'themelet-1': true,
			},
			modules: 'modules',
		})
	).toBe(true);
});

it('_filterModuleshould return unmodified input', () => {
	const val = prototype._filterModule('some-value');

	expect(val).toBe('some-value');
});

it('_filterModule should return map of checked and unchecked themelets', () => {
	prototype.modules = {
		'themelet-1': {},
		'themelet-2': {},
		'themelet-3': {},
	};
	prototype.themelet = true;

	const val = prototype._filterModule(['themelet-1']);

	expect(val).toEqual({
		'themelet-1': true,
		'themelet-2': false,
		'themelet-3': false,
	});
});

it('_getModuleWhen should return false if no modules are present', () => {
	let retVal = prototype._getModuleWhen();

	expect(!retVal).toBe(true);

	prototype.modules = {
		'themelet-1': {},
	};

	retVal = prototype._getModuleWhen();

	expect(retVal).toBe(true);
});

it('_getModuleChoices should invoke proptUtil.getModulesChoices', () => {
	const getModuleChoicesSpy = prototypeMethodSpy.add(
		promptUtil,
		'getModuleChoices'
	);

	prototype.modules = 'modules';

	prototype._getModuleChoices();

	expect(getModuleChoicesSpy.calledWith('modules', prototype)).toBe(true);
});

it('_prompt should bind correct functions to prompt question', () => {
	const promptSpy = prototypeMethodSpy.add(inquirer, 'prompt');

	const assertAfterPrompt = assertBoundFunction(prototype, '_afterPrompt');
	const assertChoicesFn = assertBoundFunction(prototype, '_getModuleChoices');
	const assertFilterFn = assertBoundFunction(prototype, '_filterModule');
	const assertWhenFn = assertBoundFunction(prototype, '_getModuleWhen');

	prototype._prompt();

	const args = promptSpy.getCall(0).args;

	const question = args[0][0];

	assertChoicesFn(question.choices);
	assertFilterFn(question.filter);
	assertWhenFn(question.when);

	assertAfterPrompt(args[1]);
});
