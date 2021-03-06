import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { Tracker } from 'meteor/tracker';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { $data } from 'meteor/meteoric124:template-scope';

import { withRenderedTemplate } from './utils/test-helpers.js';

let static_1_created = false;
let static_1_rendered = false;
let static_1_destroyed = false;
let static_1_cbs = {
    preLink: _.noop,
    postLink: _.noop
};
let static_1_instance = null;

let share_scope = false;
Template.static1.onCreated(function() {
    this.new_scope = !share_scope;

    static_1_instance = this;
    static_1_created = true;
    $(this).on('$preLink', static_1_cbs.preLink);
    $(this).on('$postLink', static_1_cbs.postLink);
});
Template.static1.onRendered(function() {
    static_1_rendered = true;
});
Template.static1.onDestroyed(function() {
    static_1_destroyed = true;
});

let static_2_created = false;
let static_2_rendered = false;
let static_2_destroyed = false;
let static_2_cbs = {
    preLink: _.noop,
    postLink: _.noop
};
let static_2_instance = null;

Template.static2.onCreated(function() {
    this.new_scope = true;

    static_2_instance = this;
    static_2_created = true;
    $(this).on('$preLink', static_2_cbs.preLink);
    $(this).on('$postLink', static_2_cbs.postLink);
});
Template.static2.onRendered(function() {
    static_2_rendered = true;
});
Template.static2.onDestroyed(function() {
    static_2_destroyed = true;
});

describe('template-scope - static-templates', function () {
    describe('Base case, just one template', function () {
        beforeEach(function() {
            // Reset the life cycle flags.
            static_1_created = false;
            static_1_rendered = false;
            static_1_destroyed = false;
            static_1_cbs = {
                preLink: _.noop,
                postLink: _.noop
            };
            static_1_instance = null;
        });

        it ('calls $preLink then $postLink', function() {
            let preLink = false;
            let postLink = false;
            static_1_cbs.preLink = function() {
                expect(preLink).toBe(false, 'Template.static1, $preLink was called twice.');
                expect(postLink).toBe(false, 'Template.static1, $postLink was called before $preLink.');
                preLink = true;
            };
            static_1_cbs.postLink = function() {
                expect(preLink).toBe(true, 'Template.static1, $preLink was not called before $postLink.');
                expect(postLink).toBe(false, 'Template.static1, $postLink was called twice.');
                postLink = true;
            };

            var view = Blaze.render(Template.static1, $('body')[0]);
            expect(static_1_created).toBe(true, 'Template.static1 not created');
            Tracker.flush();
            expect(static_1_rendered).toBe(true, 'Template.static1 not rendered');
            Blaze.remove(view);
            expect(static_1_destroyed).toBe(true, 'Template.static1 not destroyed');
        });

        it ('$emit calls the $on in the same template', function() {
            var view = Blaze.render(Template.static1, $('body')[0]);
            expect(static_1_created).toBe(true, 'Template.static1 not created');
            Tracker.flush();
            expect(static_1_rendered).toBe(true, 'Template.static1 not rendered');

            let $on_called = false;
            static_1_instance.$scope.$on('event', () => $on_called = true);
            static_1_instance.$scope.$emit('event');
            expect($on_called).toBeTruthy('Template.static2 failed to act on its own "event"');

            Blaze.remove(view);
            expect(static_1_destroyed).toBe(true, 'Template.static1 not destroyed');
        });

        it ('it destroys the entry in data-polyfill.js $scope after $destroy (not not Template.onDestroy).', function() {
            var view = Blaze.render(Template.static1, $('body')[0]);
            Tracker.flush();

            expect($data[view._templateInstance.$uid]).toBeTruthy('Template.static1 was not attached a template-scope-id attribute.');

            let $data_destroyed = false;
            view._templateInstance.$scope.$on('$destroy', () => {
                $data_destroyed = !$data[view._templateInstance.$uid];
                expect($data_destroyed).toBeFalsy('Template.static1 $data entry was not destroyed during Template destruction.');
            });

            Blaze.remove(view);
            expect(static_1_destroyed).toBe(true, 'Template.static1 not destroyed');
        });
    });

    describe('Case with two nested templates', function() {
        beforeEach(function() {
            // Reset the life cycle flags.
            static_2_created = false;
            static_2_rendered = false;
            static_2_destroyed = false;
            static_2_cbs = {
                preLink: _.noop,
                postLink: _.noop
            };
            share_scope = false;
            static_2_instance = null;
        });

        it ('calls $preLink then $postLink', function() {
            let preLink = false;
            let postLink = false;
            let preLinkCallStack = [];
            let postLinkCallStack = [];
            
            static_2_cbs.preLink = function() {
                let children = static_2_instance.children();
                expect(children.length).toBe(2);
                children.forEach(c => $(c).on('$preLink', function() {
                    preLinkCallStack.push(this);
                }));
                children.forEach(c => $(c).on('$postLink', function() {
                    postLinkCallStack.push(this);
                }));

                preLinkCallStack.push(this);
                expect(preLinkCallStack.length).toBe(1);  // Ensure it is the first one added.

                preLink = true;
            };

            static_2_cbs.postLink = function() {
                postLinkCallStack.push(this);
                postLink = true;
            };

            withRenderedTemplate('static2', {}, anchor_el => {
                expect(static_2_created).toBe(true, 'Template.static2 not created');
                Tracker.flush();

                expect(static_2_rendered).toBe(true, 'Template.static2 not rendered');

                expect(preLink).toBeTruthy('Template.static2  $preLink not called.');
                expect(preLinkCallStack.length).toBe(3);
                expect(preLinkCallStack.map(t => t.view.name)).toEqual([
                    'Template.static2',
                    'Template.static1',
                    'Template.static1'
                ], '$preLink traversal order is wrong.');

                expect(postLink).toBeTruthy('Template.static2  $postLink not called.');
                expect(postLinkCallStack.length).toBe(3);
                expect(postLinkCallStack.map(t => t.view.name)).toEqual([
                    'Template.static1',
                    'Template.static1',
                    'Template.static2'
                ], '$postLink traversal order is wrong.');
            });
        });

        it ('$emit calls the $on in the same template', function() {
            var view = Blaze.render(Template.static2, $('body')[0]);

            expect(static_2_created).toBe(true, 'Template.static2 not created');
            Tracker.flush();

            expect(static_2_rendered).toBe(true, 'Template.static2 not rendered');

            let static_2_$on_called = false;
            static_2_instance.$scope.$on('event', () => static_2_$on_called = true);

            static_2_instance.children()[0].$scope.$emit('event');
            expect(static_2_$on_called).toBe(true, 'Template.static2 failed to act on its own "event"');

            Blaze.remove(view);
            expect(static_2_destroyed).toBe(true, 'Template.static2 not destroyed');
        });

        it('Templates are shared if this.scope of child template (Template.static1) is false', function() {
            share_scope = true;

            var view = Blaze.render(Template.static2, $('body')[0]);

            expect(static_2_created).toBe(true, 'Template.static2 not created');
            Tracker.flush();

            expect(static_2_rendered).toBe(true, 'Template.static2 not rendered');

            expect(static_2_instance.$scope).toBe(static_1_instance.$scope);

            Blaze.remove(view);
            expect(static_2_destroyed).toBe(true, 'Template.static2 not destroyed');
        });
    });
});