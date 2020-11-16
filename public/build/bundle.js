
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.7' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Do a deep-copy of basic JavaScript Objects or Arrays.
     */
    function deepCopy(value) {
        return deepExtend(undefined, value);
    }
    /**
     * Copy properties from source to target (recursively allows extension
     * of Objects and Arrays).  Scalar values in the target are over-written.
     * If target is undefined, an object of the appropriate type will be created
     * (and returned).
     *
     * We recursively copy all child properties of plain Objects in the source- so
     * that namespace- like dictionaries are merged.
     *
     * Note that the target can be a function, in which case the properties in
     * the source Object are copied onto it as static properties of the Function.
     *
     * Note: we don't merge __proto__ to prevent prototype pollution
     */
    function deepExtend(target, source) {
        if (!(source instanceof Object)) {
            return source;
        }
        switch (source.constructor) {
            case Date:
                // Treat Dates like scalars; if the target date object had any child
                // properties - they will be lost!
                var dateValue = source;
                return new Date(dateValue.getTime());
            case Object:
                if (target === undefined) {
                    target = {};
                }
                break;
            case Array:
                // Always copy the array source and overwrite the target.
                target = [];
                break;
            default:
                // Not a plain Object - treat it as a scalar.
                return source;
        }
        for (var prop in source) {
            // use isValidKey to guard against prototype pollution. See https://snyk.io/vuln/SNYK-JS-LODASH-450202
            if (!source.hasOwnProperty(prop) || !isValidKey(prop)) {
                continue;
            }
            target[prop] = deepExtend(target[prop], source[prop]);
        }
        return target;
    }
    function isValidKey(key) {
        return key !== '__proto__';
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var Deferred = /** @class */ (function () {
        function Deferred() {
            var _this = this;
            this.reject = function () { };
            this.resolve = function () { };
            this.promise = new Promise(function (resolve, reject) {
                _this.resolve = resolve;
                _this.reject = reject;
            });
        }
        /**
         * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
         * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
         * and returns a node-style callback which will resolve or reject the Deferred's promise.
         */
        Deferred.prototype.wrapCallback = function (callback) {
            var _this = this;
            return function (error, value) {
                if (error) {
                    _this.reject(error);
                }
                else {
                    _this.resolve(value);
                }
                if (typeof callback === 'function') {
                    // Attaching noop handler just in case developer wasn't expecting
                    // promises
                    _this.promise.catch(function () { });
                    // Some of our callbacks don't expect a value and our own tests
                    // assert that the parameter length is 1
                    if (callback.length === 1) {
                        callback(error);
                    }
                    else {
                        callback(error, value);
                    }
                }
            };
        };
        return Deferred;
    }());

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns navigator.userAgent string or '' if it's not defined.
     * @return user agent string
     */
    function getUA() {
        if (typeof navigator !== 'undefined' &&
            typeof navigator['userAgent'] === 'string') {
            return navigator['userAgent'];
        }
        else {
            return '';
        }
    }
    /**
     * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
     *
     * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
     * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
     * wait for a callback.
     */
    function isMobileCordova() {
        return (typeof window !== 'undefined' &&
            // @ts-ignore Setting up an broadly applicable index signature for Window
            // just to deal with this case would probably be a bad idea.
            !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
            /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA()));
    }
    /**
     * Detect Node.js.
     *
     * @return true if Node.js environment is detected.
     */
    // Node detection logic from: https://github.com/iliakan/detect-node/
    function isNode() {
        try {
            return (Object.prototype.toString.call(global.process) === '[object process]');
        }
        catch (e) {
            return false;
        }
    }
    /**
     * Detect Browser Environment
     */
    function isBrowser() {
        return typeof self === 'object' && self.self === self;
    }
    function isBrowserExtension() {
        var runtime = typeof chrome === 'object'
            ? chrome.runtime
            : typeof browser === 'object'
                ? browser.runtime
                : undefined;
        return typeof runtime === 'object' && runtime.id !== undefined;
    }
    /**
     * Detect React Native.
     *
     * @return true if ReactNative environment is detected.
     */
    function isReactNative() {
        return (typeof navigator === 'object' && navigator['product'] === 'ReactNative');
    }
    /** Detects Electron apps. */
    function isElectron() {
        return getUA().indexOf('Electron/') >= 0;
    }
    /** Detects Internet Explorer. */
    function isIE() {
        var ua = getUA();
        return ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
    }
    /** Detects Universal Windows Platform apps. */
    function isUWP() {
        return getUA().indexOf('MSAppHost/') >= 0;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var ERROR_NAME = 'FirebaseError';
    // Based on code from:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
    var FirebaseError = /** @class */ (function (_super) {
        __extends(FirebaseError, _super);
        function FirebaseError(code, message, customData) {
            var _this = _super.call(this, message) || this;
            _this.code = code;
            _this.customData = customData;
            _this.name = ERROR_NAME;
            // Fix For ES5
            // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
            Object.setPrototypeOf(_this, FirebaseError.prototype);
            // Maintains proper stack trace for where our error was thrown.
            // Only available on V8.
            if (Error.captureStackTrace) {
                Error.captureStackTrace(_this, ErrorFactory.prototype.create);
            }
            return _this;
        }
        return FirebaseError;
    }(Error));
    var ErrorFactory = /** @class */ (function () {
        function ErrorFactory(service, serviceName, errors) {
            this.service = service;
            this.serviceName = serviceName;
            this.errors = errors;
        }
        ErrorFactory.prototype.create = function (code) {
            var data = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                data[_i - 1] = arguments[_i];
            }
            var customData = data[0] || {};
            var fullCode = this.service + "/" + code;
            var template = this.errors[code];
            var message = template ? replaceTemplate(template, customData) : 'Error';
            // Service Name: Error message (service/code).
            var fullMessage = this.serviceName + ": " + message + " (" + fullCode + ").";
            var error = new FirebaseError(fullCode, fullMessage, customData);
            return error;
        };
        return ErrorFactory;
    }());
    function replaceTemplate(template, data) {
        return template.replace(PATTERN, function (_, key) {
            var value = data[key];
            return value != null ? String(value) : "<" + key + "?>";
        });
    }
    var PATTERN = /\{\$([^}]+)}/g;

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function contains(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    /**
     * Helper to make a Subscribe function (just like Promise helps make a
     * Thenable).
     *
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    function createSubscribe(executor, onNoObservers) {
        var proxy = new ObserverProxy(executor, onNoObservers);
        return proxy.subscribe.bind(proxy);
    }
    /**
     * Implement fan-out for any number of Observers attached via a subscribe
     * function.
     */
    var ObserverProxy = /** @class */ (function () {
        /**
         * @param executor Function which can make calls to a single Observer
         *     as a proxy.
         * @param onNoObservers Callback when count of Observers goes to zero.
         */
        function ObserverProxy(executor, onNoObservers) {
            var _this = this;
            this.observers = [];
            this.unsubscribes = [];
            this.observerCount = 0;
            // Micro-task scheduling by calling task.then().
            this.task = Promise.resolve();
            this.finalized = false;
            this.onNoObservers = onNoObservers;
            // Call the executor asynchronously so subscribers that are called
            // synchronously after the creation of the subscribe function
            // can still receive the very first value generated in the executor.
            this.task
                .then(function () {
                executor(_this);
            })
                .catch(function (e) {
                _this.error(e);
            });
        }
        ObserverProxy.prototype.next = function (value) {
            this.forEachObserver(function (observer) {
                observer.next(value);
            });
        };
        ObserverProxy.prototype.error = function (error) {
            this.forEachObserver(function (observer) {
                observer.error(error);
            });
            this.close(error);
        };
        ObserverProxy.prototype.complete = function () {
            this.forEachObserver(function (observer) {
                observer.complete();
            });
            this.close();
        };
        /**
         * Subscribe function that can be used to add an Observer to the fan-out list.
         *
         * - We require that no event is sent to a subscriber sychronously to their
         *   call to subscribe().
         */
        ObserverProxy.prototype.subscribe = function (nextOrObserver, error, complete) {
            var _this = this;
            var observer;
            if (nextOrObserver === undefined &&
                error === undefined &&
                complete === undefined) {
                throw new Error('Missing Observer.');
            }
            // Assemble an Observer object when passed as callback functions.
            if (implementsAnyMethods(nextOrObserver, [
                'next',
                'error',
                'complete'
            ])) {
                observer = nextOrObserver;
            }
            else {
                observer = {
                    next: nextOrObserver,
                    error: error,
                    complete: complete
                };
            }
            if (observer.next === undefined) {
                observer.next = noop$1;
            }
            if (observer.error === undefined) {
                observer.error = noop$1;
            }
            if (observer.complete === undefined) {
                observer.complete = noop$1;
            }
            var unsub = this.unsubscribeOne.bind(this, this.observers.length);
            // Attempt to subscribe to a terminated Observable - we
            // just respond to the Observer with the final error or complete
            // event.
            if (this.finalized) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.task.then(function () {
                    try {
                        if (_this.finalError) {
                            observer.error(_this.finalError);
                        }
                        else {
                            observer.complete();
                        }
                    }
                    catch (e) {
                        // nothing
                    }
                    return;
                });
            }
            this.observers.push(observer);
            return unsub;
        };
        // Unsubscribe is synchronous - we guarantee that no events are sent to
        // any unsubscribed Observer.
        ObserverProxy.prototype.unsubscribeOne = function (i) {
            if (this.observers === undefined || this.observers[i] === undefined) {
                return;
            }
            delete this.observers[i];
            this.observerCount -= 1;
            if (this.observerCount === 0 && this.onNoObservers !== undefined) {
                this.onNoObservers(this);
            }
        };
        ObserverProxy.prototype.forEachObserver = function (fn) {
            if (this.finalized) {
                // Already closed by previous event....just eat the additional values.
                return;
            }
            // Since sendOne calls asynchronously - there is no chance that
            // this.observers will become undefined.
            for (var i = 0; i < this.observers.length; i++) {
                this.sendOne(i, fn);
            }
        };
        // Call the Observer via one of it's callback function. We are careful to
        // confirm that the observe has not been unsubscribed since this asynchronous
        // function had been queued.
        ObserverProxy.prototype.sendOne = function (i, fn) {
            var _this = this;
            // Execute the callback asynchronously
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(function () {
                if (_this.observers !== undefined && _this.observers[i] !== undefined) {
                    try {
                        fn(_this.observers[i]);
                    }
                    catch (e) {
                        // Ignore exceptions raised in Observers or missing methods of an
                        // Observer.
                        // Log error to console. b/31404806
                        if (typeof console !== 'undefined' && console.error) {
                            console.error(e);
                        }
                    }
                }
            });
        };
        ObserverProxy.prototype.close = function (err) {
            var _this = this;
            if (this.finalized) {
                return;
            }
            this.finalized = true;
            if (err !== undefined) {
                this.finalError = err;
            }
            // Proxy is no longer needed - garbage collect references
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(function () {
                _this.observers = undefined;
                _this.onNoObservers = undefined;
            });
        };
        return ObserverProxy;
    }());
    /**
     * Return true if the object passed in implements any of the named methods.
     */
    function implementsAnyMethods(obj, methods) {
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }
        for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
            var method = methods_1[_i];
            if (method in obj && typeof obj[method] === 'function') {
                return true;
            }
        }
        return false;
    }
    function noop$1() {
        // do nothing
    }

    /**
     * Component for service name T, e.g. `auth`, `auth-internal`
     */
    var Component = /** @class */ (function () {
        /**
         *
         * @param name The public service name, e.g. app, auth, firestore, database
         * @param instanceFactory Service factory responsible for creating the public interface
         * @param type whether the service provided by the component is public or private
         */
        function Component(name, instanceFactory, type) {
            this.name = name;
            this.instanceFactory = instanceFactory;
            this.type = type;
            this.multipleInstances = false;
            /**
             * Properties to be added to the service namespace
             */
            this.serviceProps = {};
            this.instantiationMode = "LAZY" /* LAZY */;
        }
        Component.prototype.setInstantiationMode = function (mode) {
            this.instantiationMode = mode;
            return this;
        };
        Component.prototype.setMultipleInstances = function (multipleInstances) {
            this.multipleInstances = multipleInstances;
            return this;
        };
        Component.prototype.setServiceProps = function (props) {
            this.serviceProps = props;
            return this;
        };
        return Component;
    }());

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var DEFAULT_ENTRY_NAME = '[DEFAULT]';

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
     * NameServiceMapping[T] is an alias for the type of the instance
     */
    var Provider = /** @class */ (function () {
        function Provider(name, container) {
            this.name = name;
            this.container = container;
            this.component = null;
            this.instances = new Map();
            this.instancesDeferred = new Map();
        }
        /**
         * @param identifier A provider can provide mulitple instances of a service
         * if this.component.multipleInstances is true.
         */
        Provider.prototype.get = function (identifier) {
            if (identifier === void 0) { identifier = DEFAULT_ENTRY_NAME; }
            // if multipleInstances is not supported, use the default name
            var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            if (!this.instancesDeferred.has(normalizedIdentifier)) {
                var deferred = new Deferred();
                this.instancesDeferred.set(normalizedIdentifier, deferred);
                // If the service instance is available, resolve the promise with it immediately
                try {
                    var instance = this.getOrInitializeService(normalizedIdentifier);
                    if (instance) {
                        deferred.resolve(instance);
                    }
                }
                catch (e) {
                    // when the instance factory throws an exception during get(), it should not cause
                    // a fatal error. We just return the unresolved promise in this case.
                }
            }
            return this.instancesDeferred.get(normalizedIdentifier).promise;
        };
        Provider.prototype.getImmediate = function (options) {
            var _a = __assign({ identifier: DEFAULT_ENTRY_NAME, optional: false }, options), identifier = _a.identifier, optional = _a.optional;
            // if multipleInstances is not supported, use the default name
            var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            try {
                var instance = this.getOrInitializeService(normalizedIdentifier);
                if (!instance) {
                    if (optional) {
                        return null;
                    }
                    throw Error("Service " + this.name + " is not available");
                }
                return instance;
            }
            catch (e) {
                if (optional) {
                    return null;
                }
                else {
                    throw e;
                }
            }
        };
        Provider.prototype.getComponent = function () {
            return this.component;
        };
        Provider.prototype.setComponent = function (component) {
            var e_1, _a;
            if (component.name !== this.name) {
                throw Error("Mismatching Component " + component.name + " for Provider " + this.name + ".");
            }
            if (this.component) {
                throw Error("Component for " + this.name + " has already been provided");
            }
            this.component = component;
            // if the service is eager, initialize the default instance
            if (isComponentEager(component)) {
                try {
                    this.getOrInitializeService(DEFAULT_ENTRY_NAME);
                }
                catch (e) {
                    // when the instance factory for an eager Component throws an exception during the eager
                    // initialization, it should not cause a fatal error.
                    // TODO: Investigate if we need to make it configurable, because some component may want to cause
                    // a fatal error in this case?
                }
            }
            try {
                // Create service instances for the pending promises and resolve them
                // NOTE: if this.multipleInstances is false, only the default instance will be created
                // and all promises with resolve with it regardless of the identifier.
                for (var _b = __values(this.instancesDeferred.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), instanceIdentifier = _d[0], instanceDeferred = _d[1];
                    var normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                    try {
                        // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
                        var instance = this.getOrInitializeService(normalizedIdentifier);
                        instanceDeferred.resolve(instance);
                    }
                    catch (e) {
                        // when the instance factory throws an exception, it should not cause
                        // a fatal error. We just leave the promise unresolved.
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        Provider.prototype.clearInstance = function (identifier) {
            if (identifier === void 0) { identifier = DEFAULT_ENTRY_NAME; }
            this.instancesDeferred.delete(identifier);
            this.instances.delete(identifier);
        };
        // app.delete() will call this method on every provider to delete the services
        // TODO: should we mark the provider as deleted?
        Provider.prototype.delete = function () {
            return __awaiter(this, void 0, void 0, function () {
                var services;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            services = Array.from(this.instances.values());
                            return [4 /*yield*/, Promise.all(__spread(services
                                    .filter(function (service) { return 'INTERNAL' in service; }) // legacy services
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    .map(function (service) { return service.INTERNAL.delete(); }), services
                                    .filter(function (service) { return '_delete' in service; }) // modularized services
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    .map(function (service) { return service._delete(); })))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        Provider.prototype.isComponentSet = function () {
            return this.component != null;
        };
        Provider.prototype.getOrInitializeService = function (identifier) {
            var instance = this.instances.get(identifier);
            if (!instance && this.component) {
                instance = this.component.instanceFactory(this.container, normalizeIdentifierForFactory(identifier));
                this.instances.set(identifier, instance);
            }
            return instance || null;
        };
        Provider.prototype.normalizeInstanceIdentifier = function (identifier) {
            if (this.component) {
                return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
            }
            else {
                return identifier; // assume multiple instances are supported before the component is provided.
            }
        };
        return Provider;
    }());
    // undefined should be passed to the service factory for the default instance
    function normalizeIdentifierForFactory(identifier) {
        return identifier === DEFAULT_ENTRY_NAME ? undefined : identifier;
    }
    function isComponentEager(component) {
        return component.instantiationMode === "EAGER" /* EAGER */;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
     */
    var ComponentContainer = /** @class */ (function () {
        function ComponentContainer(name) {
            this.name = name;
            this.providers = new Map();
        }
        /**
         *
         * @param component Component being added
         * @param overwrite When a component with the same name has already been registered,
         * if overwrite is true: overwrite the existing component with the new component and create a new
         * provider with the new component. It can be useful in tests where you want to use different mocks
         * for different tests.
         * if overwrite is false: throw an exception
         */
        ComponentContainer.prototype.addComponent = function (component) {
            var provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                throw new Error("Component " + component.name + " has already been registered with " + this.name);
            }
            provider.setComponent(component);
        };
        ComponentContainer.prototype.addOrOverwriteComponent = function (component) {
            var provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                // delete the existing provider from the container, so we can register the new component
                this.providers.delete(component.name);
            }
            this.addComponent(component);
        };
        /**
         * getProvider provides a type safe interface where it can only be called with a field name
         * present in NameServiceMapping interface.
         *
         * Firebase SDKs providing services should extend NameServiceMapping interface to register
         * themselves.
         */
        ComponentContainer.prototype.getProvider = function (name) {
            if (this.providers.has(name)) {
                return this.providers.get(name);
            }
            // create a Provider for a service that hasn't registered with Firebase
            var provider = new Provider(name, this);
            this.providers.set(name, provider);
            return provider;
        };
        ComponentContainer.prototype.getProviders = function () {
            return Array.from(this.providers.values());
        };
        return ComponentContainer;
    }());

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __spreadArrays$1() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var _a;
    /**
     * A container for all of the Logger instances
     */
    var instances = [];
    /**
     * The JS SDK supports 5 log levels and also allows a user the ability to
     * silence the logs altogether.
     *
     * The order is a follows:
     * DEBUG < VERBOSE < INFO < WARN < ERROR
     *
     * All of the log types above the current log level will be captured (i.e. if
     * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
     * `VERBOSE` logs will not)
     */
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
        LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
        LogLevel[LogLevel["INFO"] = 2] = "INFO";
        LogLevel[LogLevel["WARN"] = 3] = "WARN";
        LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
        LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
    })(LogLevel || (LogLevel = {}));
    var levelStringToEnum = {
        'debug': LogLevel.DEBUG,
        'verbose': LogLevel.VERBOSE,
        'info': LogLevel.INFO,
        'warn': LogLevel.WARN,
        'error': LogLevel.ERROR,
        'silent': LogLevel.SILENT
    };
    /**
     * The default log level
     */
    var defaultLogLevel = LogLevel.INFO;
    /**
     * By default, `console.debug` is not displayed in the developer console (in
     * chrome). To avoid forcing users to have to opt-in to these logs twice
     * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
     * logs to the `console.log` function.
     */
    var ConsoleMethod = (_a = {},
        _a[LogLevel.DEBUG] = 'log',
        _a[LogLevel.VERBOSE] = 'log',
        _a[LogLevel.INFO] = 'info',
        _a[LogLevel.WARN] = 'warn',
        _a[LogLevel.ERROR] = 'error',
        _a);
    /**
     * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
     * messages on to their corresponding console counterparts (if the log method
     * is supported by the current log level)
     */
    var defaultLogHandler = function (instance, logType) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (logType < instance.logLevel) {
            return;
        }
        var now = new Date().toISOString();
        var method = ConsoleMethod[logType];
        if (method) {
            console[method].apply(console, __spreadArrays$1(["[" + now + "]  " + instance.name + ":"], args));
        }
        else {
            throw new Error("Attempted to log a message with an invalid logType (value: " + logType + ")");
        }
    };
    var Logger = /** @class */ (function () {
        /**
         * Gives you an instance of a Logger to capture messages according to
         * Firebase's logging scheme.
         *
         * @param name The name that the logs will be associated with
         */
        function Logger(name) {
            this.name = name;
            /**
             * The log level of the given Logger instance.
             */
            this._logLevel = defaultLogLevel;
            /**
             * The main (internal) log handler for the Logger instance.
             * Can be set to a new function in internal package code but not by user.
             */
            this._logHandler = defaultLogHandler;
            /**
             * The optional, additional, user-defined log handler for the Logger instance.
             */
            this._userLogHandler = null;
            /**
             * Capture the current instance for later use
             */
            instances.push(this);
        }
        Object.defineProperty(Logger.prototype, "logLevel", {
            get: function () {
                return this._logLevel;
            },
            set: function (val) {
                if (!(val in LogLevel)) {
                    throw new TypeError("Invalid value \"" + val + "\" assigned to `logLevel`");
                }
                this._logLevel = val;
            },
            enumerable: false,
            configurable: true
        });
        // Workaround for setter/getter having to be the same type.
        Logger.prototype.setLogLevel = function (val) {
            this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
        };
        Object.defineProperty(Logger.prototype, "logHandler", {
            get: function () {
                return this._logHandler;
            },
            set: function (val) {
                if (typeof val !== 'function') {
                    throw new TypeError('Value assigned to `logHandler` must be a function');
                }
                this._logHandler = val;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Logger.prototype, "userLogHandler", {
            get: function () {
                return this._userLogHandler;
            },
            set: function (val) {
                this._userLogHandler = val;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * The functions below are all based on the `console` interface
         */
        Logger.prototype.debug = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.DEBUG], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.DEBUG], args));
        };
        Logger.prototype.log = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.VERBOSE], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.VERBOSE], args));
        };
        Logger.prototype.info = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.INFO], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.INFO], args));
        };
        Logger.prototype.warn = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.WARN], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.WARN], args));
        };
        Logger.prototype.error = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.ERROR], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.ERROR], args));
        };
        return Logger;
    }());
    function setLogLevel(level) {
        instances.forEach(function (inst) {
            inst.setLogLevel(level);
        });
    }
    function setUserLogHandler(logCallback, options) {
        var _loop_1 = function (instance) {
            var customLogLevel = null;
            if (options && options.level) {
                customLogLevel = levelStringToEnum[options.level];
            }
            if (logCallback === null) {
                instance.userLogHandler = null;
            }
            else {
                instance.userLogHandler = function (instance, level) {
                    var args = [];
                    for (var _i = 2; _i < arguments.length; _i++) {
                        args[_i - 2] = arguments[_i];
                    }
                    var message = args
                        .map(function (arg) {
                        if (arg == null) {
                            return null;
                        }
                        else if (typeof arg === 'string') {
                            return arg;
                        }
                        else if (typeof arg === 'number' || typeof arg === 'boolean') {
                            return arg.toString();
                        }
                        else if (arg instanceof Error) {
                            return arg.message;
                        }
                        else {
                            try {
                                return JSON.stringify(arg);
                            }
                            catch (ignored) {
                                return null;
                            }
                        }
                    })
                        .filter(function (arg) { return arg; })
                        .join(' ');
                    if (level >= (customLogLevel !== null && customLogLevel !== void 0 ? customLogLevel : instance.logLevel)) {
                        logCallback({
                            level: LogLevel[level].toLowerCase(),
                            message: message,
                            args: args,
                            type: instance.name
                        });
                    }
                };
            }
        };
        for (var _i = 0, instances_1 = instances; _i < instances_1.length; _i++) {
            var instance = instances_1[_i];
            _loop_1(instance);
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var _a$1;
    var ERRORS = (_a$1 = {},
        _a$1["no-app" /* NO_APP */] = "No Firebase App '{$appName}' has been created - " +
            'call Firebase App.initializeApp()',
        _a$1["bad-app-name" /* BAD_APP_NAME */] = "Illegal App name: '{$appName}",
        _a$1["duplicate-app" /* DUPLICATE_APP */] = "Firebase App named '{$appName}' already exists",
        _a$1["app-deleted" /* APP_DELETED */] = "Firebase App named '{$appName}' already deleted",
        _a$1["invalid-app-argument" /* INVALID_APP_ARGUMENT */] = 'firebase.{$appName}() takes either no argument or a ' +
            'Firebase App instance.',
        _a$1["invalid-log-argument" /* INVALID_LOG_ARGUMENT */] = 'First argument to `onLog` must be null or a function.',
        _a$1);
    var ERROR_FACTORY = new ErrorFactory('app', 'Firebase', ERRORS);

    var name$1 = "@firebase/app";
    var version = "0.6.13";

    var name$2 = "@firebase/analytics";

    var name$3 = "@firebase/auth";

    var name$4 = "@firebase/database";

    var name$5 = "@firebase/functions";

    var name$6 = "@firebase/installations";

    var name$7 = "@firebase/messaging";

    var name$8 = "@firebase/performance";

    var name$9 = "@firebase/remote-config";

    var name$a = "@firebase/storage";

    var name$b = "@firebase/firestore";

    var name$c = "firebase-wrapper";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var _a$1$1;
    var DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';
    var PLATFORM_LOG_STRING = (_a$1$1 = {},
        _a$1$1[name$1] = 'fire-core',
        _a$1$1[name$2] = 'fire-analytics',
        _a$1$1[name$3] = 'fire-auth',
        _a$1$1[name$4] = 'fire-rtdb',
        _a$1$1[name$5] = 'fire-fn',
        _a$1$1[name$6] = 'fire-iid',
        _a$1$1[name$7] = 'fire-fcm',
        _a$1$1[name$8] = 'fire-perf',
        _a$1$1[name$9] = 'fire-rc',
        _a$1$1[name$a] = 'fire-gcs',
        _a$1$1[name$b] = 'fire-fst',
        _a$1$1['fire-js'] = 'fire-js',
        _a$1$1[name$c] = 'fire-js-all',
        _a$1$1);

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var logger = new Logger('@firebase/app');

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Global context object for a collection of services using
     * a shared authentication state.
     */
    var FirebaseAppImpl = /** @class */ (function () {
        function FirebaseAppImpl(options, config, firebase_) {
            var e_1, _a;
            var _this = this;
            this.firebase_ = firebase_;
            this.isDeleted_ = false;
            this.name_ = config.name;
            this.automaticDataCollectionEnabled_ =
                config.automaticDataCollectionEnabled || false;
            this.options_ = deepCopy(options);
            this.container = new ComponentContainer(config.name);
            // add itself to container
            this._addComponent(new Component('app', function () { return _this; }, "PUBLIC" /* PUBLIC */));
            try {
                // populate ComponentContainer with existing components
                for (var _b = __values(this.firebase_.INTERNAL.components.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var component = _c.value;
                    this._addComponent(component);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        Object.defineProperty(FirebaseAppImpl.prototype, "automaticDataCollectionEnabled", {
            get: function () {
                this.checkDestroyed_();
                return this.automaticDataCollectionEnabled_;
            },
            set: function (val) {
                this.checkDestroyed_();
                this.automaticDataCollectionEnabled_ = val;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(FirebaseAppImpl.prototype, "name", {
            get: function () {
                this.checkDestroyed_();
                return this.name_;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(FirebaseAppImpl.prototype, "options", {
            get: function () {
                this.checkDestroyed_();
                return this.options_;
            },
            enumerable: false,
            configurable: true
        });
        FirebaseAppImpl.prototype.delete = function () {
            var _this = this;
            return new Promise(function (resolve) {
                _this.checkDestroyed_();
                resolve();
            })
                .then(function () {
                _this.firebase_.INTERNAL.removeApp(_this.name_);
                return Promise.all(_this.container.getProviders().map(function (provider) { return provider.delete(); }));
            })
                .then(function () {
                _this.isDeleted_ = true;
            });
        };
        /**
         * Return a service instance associated with this app (creating it
         * on demand), identified by the passed instanceIdentifier.
         *
         * NOTE: Currently storage and functions are the only ones that are leveraging this
         * functionality. They invoke it by calling:
         *
         * ```javascript
         * firebase.app().storage('STORAGE BUCKET ID')
         * ```
         *
         * The service name is passed to this already
         * @internal
         */
        FirebaseAppImpl.prototype._getService = function (name, instanceIdentifier) {
            if (instanceIdentifier === void 0) { instanceIdentifier = DEFAULT_ENTRY_NAME$1; }
            this.checkDestroyed_();
            // getImmediate will always succeed because _getService is only called for registered components.
            return this.container.getProvider(name).getImmediate({
                identifier: instanceIdentifier
            });
        };
        /**
         * Remove a service instance from the cache, so we will create a new instance for this service
         * when people try to get this service again.
         *
         * NOTE: currently only firestore is using this functionality to support firestore shutdown.
         *
         * @param name The service name
         * @param instanceIdentifier instance identifier in case multiple instances are allowed
         * @internal
         */
        FirebaseAppImpl.prototype._removeServiceInstance = function (name, instanceIdentifier) {
            if (instanceIdentifier === void 0) { instanceIdentifier = DEFAULT_ENTRY_NAME$1; }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.container.getProvider(name).clearInstance(instanceIdentifier);
        };
        /**
         * @param component the component being added to this app's container
         */
        FirebaseAppImpl.prototype._addComponent = function (component) {
            try {
                this.container.addComponent(component);
            }
            catch (e) {
                logger.debug("Component " + component.name + " failed to register with FirebaseApp " + this.name, e);
            }
        };
        FirebaseAppImpl.prototype._addOrOverwriteComponent = function (component) {
            this.container.addOrOverwriteComponent(component);
        };
        /**
         * This function will throw an Error if the App has already been deleted -
         * use before performing API actions on the App.
         */
        FirebaseAppImpl.prototype.checkDestroyed_ = function () {
            if (this.isDeleted_) {
                throw ERROR_FACTORY.create("app-deleted" /* APP_DELETED */, { appName: this.name_ });
            }
        };
        return FirebaseAppImpl;
    }());
    // Prevent dead-code elimination of these methods w/o invalid property
    // copying.
    (FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options) ||
        FirebaseAppImpl.prototype.delete ||
        console.log('dc');

    var version$1 = "8.0.1";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Because auth can't share code with other components, we attach the utility functions
     * in an internal namespace to share code.
     * This function return a firebase namespace object without
     * any utility functions, so it can be shared between the regular firebaseNamespace and
     * the lite version.
     */
    function createFirebaseNamespaceCore(firebaseAppImpl) {
        var apps = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var components = new Map();
        // A namespace is a plain JavaScript Object.
        var namespace = {
            // Hack to prevent Babel from modifying the object returned
            // as the firebase namespace.
            // @ts-ignore
            __esModule: true,
            initializeApp: initializeApp,
            // @ts-ignore
            app: app,
            registerVersion: registerVersion,
            setLogLevel: setLogLevel,
            onLog: onLog,
            // @ts-ignore
            apps: null,
            SDK_VERSION: version$1,
            INTERNAL: {
                registerComponent: registerComponent,
                removeApp: removeApp,
                components: components,
                useAsService: useAsService
            }
        };
        // Inject a circular default export to allow Babel users who were previously
        // using:
        //
        //   import firebase from 'firebase';
        //   which becomes: var firebase = require('firebase').default;
        //
        // instead of
        //
        //   import * as firebase from 'firebase';
        //   which becomes: var firebase = require('firebase');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        namespace['default'] = namespace;
        // firebase.apps is a read-only getter.
        Object.defineProperty(namespace, 'apps', {
            get: getApps
        });
        /**
         * Called by App.delete() - but before any services associated with the App
         * are deleted.
         */
        function removeApp(name) {
            delete apps[name];
        }
        /**
         * Get the App object for a given name (or DEFAULT).
         */
        function app(name) {
            name = name || DEFAULT_ENTRY_NAME$1;
            if (!contains(apps, name)) {
                throw ERROR_FACTORY.create("no-app" /* NO_APP */, { appName: name });
            }
            return apps[name];
        }
        // @ts-ignore
        app['App'] = firebaseAppImpl;
        function initializeApp(options, rawConfig) {
            if (rawConfig === void 0) { rawConfig = {}; }
            if (typeof rawConfig !== 'object' || rawConfig === null) {
                var name_1 = rawConfig;
                rawConfig = { name: name_1 };
            }
            var config = rawConfig;
            if (config.name === undefined) {
                config.name = DEFAULT_ENTRY_NAME$1;
            }
            var name = config.name;
            if (typeof name !== 'string' || !name) {
                throw ERROR_FACTORY.create("bad-app-name" /* BAD_APP_NAME */, {
                    appName: String(name)
                });
            }
            if (contains(apps, name)) {
                throw ERROR_FACTORY.create("duplicate-app" /* DUPLICATE_APP */, { appName: name });
            }
            var app = new firebaseAppImpl(options, config, namespace);
            apps[name] = app;
            return app;
        }
        /*
         * Return an array of all the non-deleted FirebaseApps.
         */
        function getApps() {
            // Make a copy so caller cannot mutate the apps list.
            return Object.keys(apps).map(function (name) { return apps[name]; });
        }
        function registerComponent(component) {
            var e_1, _a;
            var componentName = component.name;
            if (components.has(componentName)) {
                logger.debug("There were multiple attempts to register component " + componentName + ".");
                return component.type === "PUBLIC" /* PUBLIC */
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        namespace[componentName]
                    : null;
            }
            components.set(componentName, component);
            // create service namespace for public components
            if (component.type === "PUBLIC" /* PUBLIC */) {
                // The Service namespace is an accessor function ...
                var serviceNamespace = function (appArg) {
                    if (appArg === void 0) { appArg = app(); }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (typeof appArg[componentName] !== 'function') {
                        // Invalid argument.
                        // This happens in the following case: firebase.storage('gs:/')
                        throw ERROR_FACTORY.create("invalid-app-argument" /* INVALID_APP_ARGUMENT */, {
                            appName: componentName
                        });
                    }
                    // Forward service instance lookup to the FirebaseApp.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return appArg[componentName]();
                };
                // ... and a container for service-level properties.
                if (component.serviceProps !== undefined) {
                    deepExtend(serviceNamespace, component.serviceProps);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                namespace[componentName] = serviceNamespace;
                // Patch the FirebaseAppImpl prototype
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                firebaseAppImpl.prototype[componentName] =
                    // TODO: The eslint disable can be removed and the 'ignoreRestArgs'
                    // option added to the no-explicit-any rule when ESlint releases it.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        var serviceFxn = this._getService.bind(this, componentName);
                        return serviceFxn.apply(this, component.multipleInstances ? args : []);
                    };
            }
            try {
                // add the component to existing app instances
                for (var _b = __values(Object.keys(apps)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var appName = _c.value;
                    apps[appName]._addComponent(component);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return component.type === "PUBLIC" /* PUBLIC */
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    namespace[componentName]
                : null;
        }
        function registerVersion(libraryKeyOrName, version, variant) {
            var _a;
            // TODO: We can use this check to whitelist strings when/if we set up
            // a good whitelist system.
            var library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;
            if (variant) {
                library += "-" + variant;
            }
            var libraryMismatch = library.match(/\s|\//);
            var versionMismatch = version.match(/\s|\//);
            if (libraryMismatch || versionMismatch) {
                var warning = [
                    "Unable to register library \"" + library + "\" with version \"" + version + "\":"
                ];
                if (libraryMismatch) {
                    warning.push("library name \"" + library + "\" contains illegal characters (whitespace or \"/\")");
                }
                if (libraryMismatch && versionMismatch) {
                    warning.push('and');
                }
                if (versionMismatch) {
                    warning.push("version name \"" + version + "\" contains illegal characters (whitespace or \"/\")");
                }
                logger.warn(warning.join(' '));
                return;
            }
            registerComponent(new Component(library + "-version", function () { return ({ library: library, version: version }); }, "VERSION" /* VERSION */));
        }
        function onLog(logCallback, options) {
            if (logCallback !== null && typeof logCallback !== 'function') {
                throw ERROR_FACTORY.create("invalid-log-argument" /* INVALID_LOG_ARGUMENT */, {
                    appName: name
                });
            }
            setUserLogHandler(logCallback, options);
        }
        // Map the requested service to a registered service name
        // (used to map auth to serverAuth service when needed).
        function useAsService(app, name) {
            if (name === 'serverAuth') {
                return null;
            }
            var useService = name;
            return useService;
        }
        return namespace;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Return a firebase namespace object.
     *
     * In production, this will be called exactly once and the result
     * assigned to the 'firebase' global.  It may be called multiple times
     * in unit tests.
     */
    function createFirebaseNamespace() {
        var namespace = createFirebaseNamespaceCore(FirebaseAppImpl);
        namespace.INTERNAL = __assign(__assign({}, namespace.INTERNAL), { createFirebaseNamespace: createFirebaseNamespace,
            extendNamespace: extendNamespace,
            createSubscribe: createSubscribe,
            ErrorFactory: ErrorFactory,
            deepExtend: deepExtend });
        /**
         * Patch the top-level firebase namespace with additional properties.
         *
         * firebase.INTERNAL.extendNamespace()
         */
        function extendNamespace(props) {
            deepExtend(namespace, props);
        }
        return namespace;
    }
    var firebase = createFirebaseNamespace();

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var PlatformLoggerService = /** @class */ (function () {
        function PlatformLoggerService(container) {
            this.container = container;
        }
        // In initial implementation, this will be called by installations on
        // auth token refresh, and installations will send this string.
        PlatformLoggerService.prototype.getPlatformInfoString = function () {
            var providers = this.container.getProviders();
            // Loop through providers and get library/version pairs from any that are
            // version components.
            return providers
                .map(function (provider) {
                if (isVersionServiceProvider(provider)) {
                    var service = provider.getImmediate();
                    return service.library + "/" + service.version;
                }
                else {
                    return null;
                }
            })
                .filter(function (logString) { return logString; })
                .join(' ');
        };
        return PlatformLoggerService;
    }());
    /**
     *
     * @param provider check if this provider provides a VersionService
     *
     * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
     * provides VersionService. The provider is not necessarily a 'app-version'
     * provider.
     */
    function isVersionServiceProvider(provider) {
        var component = provider.getComponent();
        return (component === null || component === void 0 ? void 0 : component.type) === "VERSION" /* VERSION */;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function registerCoreComponents(firebase, variant) {
        firebase.INTERNAL.registerComponent(new Component('platform-logger', function (container) { return new PlatformLoggerService(container); }, "PRIVATE" /* PRIVATE */));
        // Register `app` package.
        firebase.registerVersion(name$1, version, variant);
        // Register platform SDK identifier (no version).
        firebase.registerVersion('fire-js', '');
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Firebase Lite detection test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (isBrowser() && self.firebase !== undefined) {
        logger.warn("\n    Warning: Firebase is already defined in the global scope. Please make sure\n    Firebase library is only loaded once.\n  ");
        // eslint-disable-next-line
        var sdkVersion = self.firebase.SDK_VERSION;
        if (sdkVersion && sdkVersion.indexOf('LITE') >= 0) {
            logger.warn("\n    Warning: You are trying to load Firebase while using Firebase Performance standalone script.\n    You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.\n    ");
        }
    }
    var initializeApp = firebase.initializeApp;
    // TODO: This disable can be removed and the 'ignoreRestArgs' option added to
    // the no-explicit-any rule when ESlint releases it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    firebase.initializeApp = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Environment check before initializing app
        // Do the check in initializeApp, so people have a chance to disable it by setting logLevel
        // in @firebase/logger
        if (isNode()) {
            logger.warn("\n      Warning: This is a browser-targeted Firebase bundle but it appears it is being\n      run in a Node environment.  If running in a Node environment, make sure you\n      are using the bundle specified by the \"main\" field in package.json.\n      \n      If you are using Webpack, you can specify \"main\" as the first item in\n      \"resolve.mainFields\":\n      https://webpack.js.org/configuration/resolve/#resolvemainfields\n      \n      If using Rollup, use the @rollup/plugin-node-resolve plugin and specify \"main\"\n      as the first item in \"mainFields\", e.g. ['main', 'module'].\n      https://github.com/rollup/@rollup/plugin-node-resolve\n      ");
        }
        return initializeApp.apply(undefined, args);
    };
    var firebase$1 = firebase;
    registerCoreComponents(firebase$1);

    var name$d = "firebase";
    var version$2 = "8.0.2";

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    firebase$1.registerVersion(name$d, version$2, 'app');

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics$1 = function(d, b) {
        extendStatics$1 = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics$1(d, b);
    };

    function __extends$1(d, b) {
        extendStatics$1(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    function __values$1(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var g, goog = goog || {}, k = commonjsGlobal || self;
    function aa() { }
    function ba(a) { var b = typeof a; return "object" != b ? b : a ? Array.isArray(a) ? "array" : b : "null"; }
    function ca(a) { var b = ba(a); return "array" == b || "object" == b && "number" == typeof a.length; }
    function n(a) { var b = typeof a; return "object" == b && null != a || "function" == b; }
    function da(a) { return Object.prototype.hasOwnProperty.call(a, ea) && a[ea] || (a[ea] = ++fa); }
    var ea = "closure_uid_" + (1E9 * Math.random() >>> 0), fa = 0;
    function ha(a, b, c) { return a.call.apply(a.bind, arguments); }
    function ja(a, b, c) { if (!a)
        throw Error(); if (2 < arguments.length) {
        var d = Array.prototype.slice.call(arguments, 2);
        return function () { var e = Array.prototype.slice.call(arguments); Array.prototype.unshift.apply(e, d); return a.apply(b, e); };
    } return function () { return a.apply(b, arguments); }; }
    function p(a, b, c) { Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? p = ha : p = ja; return p.apply(null, arguments); }
    function ka(a, b) { var c = Array.prototype.slice.call(arguments, 1); return function () { var d = c.slice(); d.push.apply(d, arguments); return a.apply(this, d); }; }
    var q = Date.now;
    function r(a, b) { function c() { } c.prototype = b.prototype; a.S = b.prototype; a.prototype = new c; a.prototype.constructor = a; }
    function u() { this.j = this.j; this.i = this.i; }
    var la = 0;
    u.prototype.j = !1;
    u.prototype.ja = function () { if (!this.j && (this.j = !0, this.G(), 0 != la)) {
        var a = da(this);
    } };
    u.prototype.G = function () { if (this.i)
        for (; this.i.length;)
            this.i.shift()(); };
    var na = Array.prototype.indexOf ? function (a, b) { return Array.prototype.indexOf.call(a, b, void 0); } : function (a, b) { if ("string" === typeof a)
        return "string" !== typeof b || 1 != b.length ? -1 : a.indexOf(b, 0); for (var c = 0; c < a.length; c++)
        if (c in a && a[c] === b)
            return c; return -1; }, oa = Array.prototype.forEach ? function (a, b, c) { Array.prototype.forEach.call(a, b, c); } : function (a, b, c) { for (var d = a.length, e = "string" === typeof a ? a.split("") : a, f = 0; f < d; f++)
        f in e && b.call(c, e[f], f, a); };
    function pa(a) { a: {
        var b = qa;
        for (var c = a.length, d = "string" === typeof a ? a.split("") : a, e = 0; e < c; e++)
            if (e in d && b.call(void 0, d[e], e, a)) {
                b = e;
                break a;
            }
        b = -1;
    } return 0 > b ? null : "string" === typeof a ? a.charAt(b) : a[b]; }
    function ra(a) { return Array.prototype.concat.apply([], arguments); }
    function sa(a) { var b = a.length; if (0 < b) {
        for (var c = Array(b), d = 0; d < b; d++)
            c[d] = a[d];
        return c;
    } return []; }
    function ta(a) { return /^[\s\xa0]*$/.test(a); }
    var ua = String.prototype.trim ? function (a) { return a.trim(); } : function (a) { return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(a)[1]; };
    function v(a, b) { return -1 != a.indexOf(b); }
    function xa(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
    var w;
    a: {
        var ya = k.navigator;
        if (ya) {
            var za = ya.userAgent;
            if (za) {
                w = za;
                break a;
            }
        }
        w = "";
    }
    function Aa(a, b, c) { for (var d in a)
        b.call(c, a[d], d, a); }
    function Ba(a) { var b = {}; for (var c in a)
        b[c] = a[c]; return b; }
    var Ca = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
    function Da(a, b) { var c, d; for (var e = 1; e < arguments.length; e++) {
        d = arguments[e];
        for (c in d)
            a[c] = d[c];
        for (var f = 0; f < Ca.length; f++)
            c = Ca[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c]);
    } }
    function Ea(a) { Ea[" "](a); return a; }
    Ea[" "] = aa;
    function Fa(a, b) { var c = Ga; return Object.prototype.hasOwnProperty.call(c, a) ? c[a] : c[a] = b(a); }
    var Ha = v(w, "Opera"), x = v(w, "Trident") || v(w, "MSIE"), Ia = v(w, "Edge"), Ja = Ia || x, Ka = v(w, "Gecko") && !(v(w.toLowerCase(), "webkit") && !v(w, "Edge")) && !(v(w, "Trident") || v(w, "MSIE")) && !v(w, "Edge"), La = v(w.toLowerCase(), "webkit") && !v(w, "Edge");
    function Ma() { var a = k.document; return a ? a.documentMode : void 0; }
    var Na;
    a: {
        var Oa = "", Pa = function () { var a = w; if (Ka)
            return /rv:([^\);]+)(\)|;)/.exec(a); if (Ia)
            return /Edge\/([\d\.]+)/.exec(a); if (x)
            return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a); if (La)
            return /WebKit\/(\S+)/.exec(a); if (Ha)
            return /(?:Version)[ \/]?(\S+)/.exec(a); }();
        Pa && (Oa = Pa ? Pa[1] : "");
        if (x) {
            var Qa = Ma();
            if (null != Qa && Qa > parseFloat(Oa)) {
                Na = String(Qa);
                break a;
            }
        }
        Na = Oa;
    }
    var Ga = {};
    function Ra(a) { return Fa(a, function () { {
        var b = 0;
        var e = ua(String(Na)).split("."), f = ua(String(a)).split("."), h = Math.max(e.length, f.length);
        for (var m = 0; 0 == b && m < h; m++) {
            var c = e[m] || "", d = f[m] || "";
            do {
                c = /(\d*)(\D*)(.*)/.exec(c) || ["", "", "", ""];
                d = /(\d*)(\D*)(.*)/.exec(d) || ["", "", "", ""];
                if (0 == c[0].length && 0 == d[0].length)
                    break;
                b = xa(0 == c[1].length ? 0 : parseInt(c[1], 10), 0 == d[1].length ? 0 : parseInt(d[1], 10)) || xa(0 == c[2].length, 0 == d[2].length) || xa(c[2], d[2]);
                c = c[3];
                d = d[3];
            } while (0 == b);
        }
    } return 0 <= b; }); }
    var Sa;
    if (k.document && x) {
        var Ta = Ma();
        Sa = Ta ? Ta : parseInt(Na, 10) || void 0;
    }
    else
        Sa = void 0;
    var Ua = Sa;
    var Va = !x || 9 <= Number(Ua), Wa = x && !Ra("9"), Xa = function () { if (!k.addEventListener || !Object.defineProperty)
        return !1; var a = !1, b = Object.defineProperty({}, "passive", { get: function () { a = !0; } }); try {
        k.addEventListener("test", aa, b), k.removeEventListener("test", aa, b);
    }
    catch (c) { } return a; }();
    function y(a, b) { this.type = a; this.a = this.target = b; this.defaultPrevented = !1; }
    y.prototype.b = function () { this.defaultPrevented = !0; };
    function A(a, b) {
        y.call(this, a ? a.type : "");
        this.relatedTarget = this.a = this.target = null;
        this.button = this.screenY = this.screenX = this.clientY = this.clientX = 0;
        this.key = "";
        this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1;
        this.pointerId = 0;
        this.pointerType = "";
        this.c = null;
        if (a) {
            var c = this.type = a.type, d = a.changedTouches && a.changedTouches.length ? a.changedTouches[0] : null;
            this.target = a.target || a.srcElement;
            this.a = b;
            if (b = a.relatedTarget) {
                if (Ka) {
                    a: {
                        try {
                            Ea(b.nodeName);
                            var e = !0;
                            break a;
                        }
                        catch (f) { }
                        e = !1;
                    }
                    e || (b = null);
                }
            }
            else
                "mouseover" ==
                    c ? b = a.fromElement : "mouseout" == c && (b = a.toElement);
            this.relatedTarget = b;
            d ? (this.clientX = void 0 !== d.clientX ? d.clientX : d.pageX, this.clientY = void 0 !== d.clientY ? d.clientY : d.pageY, this.screenX = d.screenX || 0, this.screenY = d.screenY || 0) : (this.clientX = void 0 !== a.clientX ? a.clientX : a.pageX, this.clientY = void 0 !== a.clientY ? a.clientY : a.pageY, this.screenX = a.screenX || 0, this.screenY = a.screenY || 0);
            this.button = a.button;
            this.key = a.key || "";
            this.ctrlKey = a.ctrlKey;
            this.altKey = a.altKey;
            this.shiftKey = a.shiftKey;
            this.metaKey =
                a.metaKey;
            this.pointerId = a.pointerId || 0;
            this.pointerType = "string" === typeof a.pointerType ? a.pointerType : Ya[a.pointerType] || "";
            this.c = a;
            a.defaultPrevented && this.b();
        }
    }
    r(A, y);
    var Ya = { 2: "touch", 3: "pen", 4: "mouse" };
    A.prototype.b = function () { A.S.b.call(this); var a = this.c; if (a.preventDefault)
        a.preventDefault();
    else if (a.returnValue = !1, Wa)
        try {
            if (a.ctrlKey || 112 <= a.keyCode && 123 >= a.keyCode)
                a.keyCode = -1;
        }
        catch (b) { } };
    var C = "closure_listenable_" + (1E6 * Math.random() | 0), Za = 0;
    function $a(a, b, c, d, e) { this.listener = a; this.proxy = null; this.src = b; this.type = c; this.capture = !!d; this.ca = e; this.key = ++Za; this.Y = this.Z = !1; }
    function ab(a) { a.Y = !0; a.listener = null; a.proxy = null; a.src = null; a.ca = null; }
    function bb(a) { this.src = a; this.a = {}; this.b = 0; }
    bb.prototype.add = function (a, b, c, d, e) { var f = a.toString(); a = this.a[f]; a || (a = this.a[f] = [], this.b++); var h = cb(a, b, d, e); -1 < h ? (b = a[h], c || (b.Z = !1)) : (b = new $a(b, this.src, f, !!d, e), b.Z = c, a.push(b)); return b; };
    function db(a, b) { var c = b.type; if (c in a.a) {
        var d = a.a[c], e = na(d, b), f;
        (f = 0 <= e) && Array.prototype.splice.call(d, e, 1);
        f && (ab(b), 0 == a.a[c].length && (delete a.a[c], a.b--));
    } }
    function cb(a, b, c, d) { for (var e = 0; e < a.length; ++e) {
        var f = a[e];
        if (!f.Y && f.listener == b && f.capture == !!c && f.ca == d)
            return e;
    } return -1; }
    var eb = "closure_lm_" + (1E6 * Math.random() | 0), fb = {};
    function hb(a, b, c, d, e) { if (d && d.once)
        return ib(a, b, c, d, e); if (Array.isArray(b)) {
        for (var f = 0; f < b.length; f++)
            hb(a, b[f], c, d, e);
        return null;
    } c = jb(c); return a && a[C] ? a.va(b, c, n(d) ? !!d.capture : !!d, e) : kb(a, b, c, !1, d, e); }
    function kb(a, b, c, d, e, f) {
        if (!b)
            throw Error("Invalid event type");
        var h = n(e) ? !!e.capture : !!e;
        if (h && !Va)
            return null;
        var m = lb(a);
        m || (a[eb] = m = new bb(a));
        c = m.add(b, c, d, h, f);
        if (c.proxy)
            return c;
        d = mb();
        c.proxy = d;
        d.src = a;
        d.listener = c;
        if (a.addEventListener)
            Xa || (e = h), void 0 === e && (e = !1), a.addEventListener(b.toString(), d, e);
        else if (a.attachEvent)
            a.attachEvent(nb(b.toString()), d);
        else if (a.addListener && a.removeListener)
            a.addListener(d);
        else
            throw Error("addEventListener and attachEvent are unavailable.");
        return c;
    }
    function mb() { var a = ob, b = Va ? function (c) { return a.call(b.src, b.listener, c); } : function (c) { c = a.call(b.src, b.listener, c); if (!c)
        return c; }; return b; }
    function ib(a, b, c, d, e) { if (Array.isArray(b)) {
        for (var f = 0; f < b.length; f++)
            ib(a, b[f], c, d, e);
        return null;
    } c = jb(c); return a && a[C] ? a.wa(b, c, n(d) ? !!d.capture : !!d, e) : kb(a, b, c, !0, d, e); }
    function pb(a, b, c, d, e) { if (Array.isArray(b))
        for (var f = 0; f < b.length; f++)
            pb(a, b[f], c, d, e);
    else
        (d = n(d) ? !!d.capture : !!d, c = jb(c), a && a[C]) ? (a = a.c, b = String(b).toString(), b in a.a && (f = a.a[b], c = cb(f, c, d, e), -1 < c && (ab(f[c]), Array.prototype.splice.call(f, c, 1), 0 == f.length && (delete a.a[b], a.b--)))) : a && (a = lb(a)) && (b = a.a[b.toString()], a = -1, b && (a = cb(b, c, d, e)), (c = -1 < a ? b[a] : null) && rb(c)); }
    function rb(a) { if ("number" !== typeof a && a && !a.Y) {
        var b = a.src;
        if (b && b[C])
            db(b.c, a);
        else {
            var c = a.type, d = a.proxy;
            b.removeEventListener ? b.removeEventListener(c, d, a.capture) : b.detachEvent ? b.detachEvent(nb(c), d) : b.addListener && b.removeListener && b.removeListener(d);
            (c = lb(b)) ? (db(c, a), 0 == c.b && (c.src = null, b[eb] = null)) : ab(a);
        }
    } }
    function nb(a) { return a in fb ? fb[a] : fb[a] = "on" + a; }
    function sb(a, b) { var c = a.listener, d = a.ca || a.src; a.Z && rb(a); return c.call(d, b); }
    function ob(a, b) { if (a.Y)
        return !0; if (!Va) {
        if (!b)
            a: {
                b = ["window", "event"];
                for (var c = k, d = 0; d < b.length; d++)
                    if (c = c[b[d]], null == c) {
                        b = null;
                        break a;
                    }
                b = c;
            }
        b = new A(b, this);
        return sb(a, b);
    } return sb(a, new A(b, this)); }
    function lb(a) { a = a[eb]; return a instanceof bb ? a : null; }
    var tb = "__closure_events_fn_" + (1E9 * Math.random() >>> 0);
    function jb(a) { if ("function" == ba(a))
        return a; a[tb] || (a[tb] = function (b) { return a.handleEvent(b); }); return a[tb]; }
    function D() { u.call(this); this.c = new bb(this); this.J = this; this.C = null; }
    r(D, u);
    D.prototype[C] = !0;
    g = D.prototype;
    g.addEventListener = function (a, b, c, d) { hb(this, a, b, c, d); };
    g.removeEventListener = function (a, b, c, d) { pb(this, a, b, c, d); };
    g.dispatchEvent = function (a) { var b, c = this.C; if (c)
        for (b = []; c; c = c.C)
            b.push(c); c = this.J; var d = a.type || a; if ("string" === typeof a)
        a = new y(a, c);
    else if (a instanceof y)
        a.target = a.target || c;
    else {
        var e = a;
        a = new y(d, c);
        Da(a, e);
    } e = !0; if (b)
        for (var f = b.length - 1; 0 <= f; f--) {
            var h = a.a = b[f];
            e = ub(h, d, !0, a) && e;
        } h = a.a = c; e = ub(h, d, !0, a) && e; e = ub(h, d, !1, a) && e; if (b)
        for (f = 0; f < b.length; f++)
            h = a.a = b[f], e = ub(h, d, !1, a) && e; return e; };
    g.G = function () { D.S.G.call(this); if (this.c) {
        var a = this.c, c;
        for (c in a.a) {
            for (var d = a.a[c], e = 0; e < d.length; e++)
                ab(d[e]);
            delete a.a[c];
            a.b--;
        }
    } this.C = null; };
    g.va = function (a, b, c, d) { return this.c.add(String(a), b, !1, c, d); };
    g.wa = function (a, b, c, d) { return this.c.add(String(a), b, !0, c, d); };
    function ub(a, b, c, d) { b = a.c.a[String(b)]; if (!b)
        return !0; b = b.concat(); for (var e = !0, f = 0; f < b.length; ++f) {
        var h = b[f];
        if (h && !h.Y && h.capture == c) {
            var m = h.listener, l = h.ca || h.src;
            h.Z && db(a.c, h);
            e = !1 !== m.call(l, d) && e;
        }
    } return e && !d.defaultPrevented; }
    var vb = k.JSON.stringify;
    function wb() { this.b = this.a = null; }
    var yb = new /** @class */ (function () {
        function class_1(a, b, c) {
            this.f = c;
            this.c = a;
            this.g = b;
            this.b = 0;
            this.a = null;
        }
        class_1.prototype.get = function () { var a; 0 < this.b ? (this.b--, a = this.a, this.a = a.next, a.next = null) : a = this.c(); return a; };
        return class_1;
    }())(function () { return new xb; }, function (a) { a.reset(); }, 100);
    wb.prototype.add = function (a, b) { var c = yb.get(); c.set(a, b); this.b ? this.b.next = c : this.a = c; this.b = c; };
    function zb() { var a = Ab, b = null; a.a && (b = a.a, a.a = a.a.next, a.a || (a.b = null), b.next = null); return b; }
    function xb() { this.next = this.b = this.a = null; }
    xb.prototype.set = function (a, b) { this.a = a; this.b = b; this.next = null; };
    xb.prototype.reset = function () { this.next = this.b = this.a = null; };
    function Bb(a) { k.setTimeout(function () { throw a; }, 0); }
    function Cb(a, b) { Db || Eb(); Fb || (Db(), Fb = !0); Ab.add(a, b); }
    var Db;
    function Eb() { var a = k.Promise.resolve(void 0); Db = function () { a.then(Gb); }; }
    var Fb = !1, Ab = new wb;
    function Gb() { for (var a; a = zb();) {
        try {
            a.a.call(a.b);
        }
        catch (c) {
            Bb(c);
        }
        var b = yb;
        b.g(a);
        b.b < b.f && (b.b++, a.next = b.a, b.a = a);
    } Fb = !1; }
    function Hb(a, b) { D.call(this); this.b = a || 1; this.a = b || k; this.f = p(this.Ya, this); this.g = q(); }
    r(Hb, D);
    g = Hb.prototype;
    g.aa = !1;
    g.M = null;
    g.Ya = function () { if (this.aa) {
        var a = q() - this.g;
        0 < a && a < .8 * this.b ? this.M = this.a.setTimeout(this.f, this.b - a) : (this.M && (this.a.clearTimeout(this.M), this.M = null), this.dispatchEvent("tick"), this.aa && (Ib(this), this.start()));
    } };
    g.start = function () { this.aa = !0; this.M || (this.M = this.a.setTimeout(this.f, this.b), this.g = q()); };
    function Ib(a) { a.aa = !1; a.M && (a.a.clearTimeout(a.M), a.M = null); }
    g.G = function () { Hb.S.G.call(this); Ib(this); delete this.a; };
    function Jb(a, b, c) { if ("function" == ba(a))
        c && (a = p(a, c));
    else if (a && "function" == typeof a.handleEvent)
        a = p(a.handleEvent, a);
    else
        throw Error("Invalid listener argument"); return 2147483647 < Number(b) ? -1 : k.setTimeout(a, b || 0); }
    function Kb(a) { a.a = Jb(function () { a.a = null; a.c && (a.c = !1, Kb(a)); }, a.h); var b = a.b; a.b = null; a.g.apply(null, b); }
    var Lb = /** @class */ (function (_super) {
        __extends$1(Lb, _super);
        function Lb(a, b, c) {
            var _this = _super.call(this) || this;
            _this.g = null != c ? a.bind(c) : a;
            _this.h = b;
            _this.b = null;
            _this.c = !1;
            _this.a = null;
            return _this;
        }
        Lb.prototype.f = function (a) { this.b = arguments; this.a ? this.c = !0 : Kb(this); };
        Lb.prototype.G = function () { _super.prototype.G.call(this); this.a && (k.clearTimeout(this.a), this.a = null, this.c = !1, this.b = null); };
        return Lb;
    }(u));
    function E(a) { u.call(this); this.b = a; this.a = {}; }
    r(E, u);
    var Mb = [];
    function Nb(a, b, c, d) { Array.isArray(c) || (c && (Mb[0] = c.toString()), c = Mb); for (var e = 0; e < c.length; e++) {
        var f = hb(b, c[e], d || a.handleEvent, !1, a.b || a);
        if (!f)
            break;
        a.a[f.key] = f;
    } }
    function Ob(a) { Aa(a.a, function (b, c) { this.a.hasOwnProperty(c) && rb(b); }, a); a.a = {}; }
    E.prototype.G = function () { E.S.G.call(this); Ob(this); };
    E.prototype.handleEvent = function () { throw Error("EventHandler.handleEvent not implemented"); };
    function Pb() { this.a = !0; }
    function Qb(a, b, c, d, e, f) { a.info(function () { if (a.a)
        if (f) {
            var h = "";
            for (var m = f.split("&"), l = 0; l < m.length; l++) {
                var t = m[l].split("=");
                if (1 < t.length) {
                    var B = t[0];
                    t = t[1];
                    var z = B.split("_");
                    h = 2 <= z.length && "type" == z[1] ? h + (B + "=" + t + "&") : h + (B + "=redacted&");
                }
            }
        }
        else
            h = null;
    else
        h = f; return "XMLHTTP REQ (" + d + ") [attempt " + e + "]: " + b + "\n" + c + "\n" + h; }); }
    function Rb(a, b, c, d, e, f, h) { a.info(function () { return "XMLHTTP RESP (" + d + ") [ attempt " + e + "]: " + b + "\n" + c + "\n" + f + " " + h; }); }
    function F(a, b, c, d) { a.info(function () { return "XMLHTTP TEXT (" + b + "): " + Sb(a, c) + (d ? " " + d : ""); }); }
    function Tb(a, b) { a.info(function () { return "TIMEOUT: " + b; }); }
    Pb.prototype.info = function () { };
    function Sb(a, b) { if (!a.a)
        return b; if (!b)
        return null; try {
        var c = JSON.parse(b);
        if (c)
            for (a = 0; a < c.length; a++)
                if (Array.isArray(c[a])) {
                    var d = c[a];
                    if (!(2 > d.length)) {
                        var e = d[1];
                        if (Array.isArray(e) && !(1 > e.length)) {
                            var f = e[0];
                            if ("noop" != f && "stop" != f && "close" != f)
                                for (var h = 1; h < e.length; h++)
                                    e[h] = "";
                        }
                    }
                }
        return vb(c);
    }
    catch (m) {
        return b;
    } }
    var Ub = null;
    function Vb() { return Ub = Ub || new D; }
    function Wb(a) { y.call(this, "serverreachability", a); }
    r(Wb, y);
    function G(a) { var b = Vb(); b.dispatchEvent(new Wb(b, a)); }
    function Xb(a) { y.call(this, "statevent", a); }
    r(Xb, y);
    function H(a) { var b = Vb(); b.dispatchEvent(new Xb(b, a)); }
    function Yb(a) { y.call(this, "timingevent", a); }
    r(Yb, y);
    function I(a, b) { if ("function" != ba(a))
        throw Error("Fn must not be null and must be a function"); return k.setTimeout(function () { a(); }, b); }
    var Zb = { NO_ERROR: 0, Za: 1, gb: 2, fb: 3, bb: 4, eb: 5, hb: 6, Da: 7, TIMEOUT: 8, kb: 9 };
    var $b = { ab: "complete", ob: "success", Ea: "error", Da: "abort", mb: "ready", nb: "readystatechange", TIMEOUT: "timeout", ib: "incrementaldata", lb: "progress", cb: "downloadprogress", pb: "uploadprogress" };
    function ac() { }
    ac.prototype.a = null;
    function bc(a) { var b; (b = a.a) || (b = a.a = {}); return b; }
    function cc() { }
    var J = { OPEN: "a", $a: "b", Ea: "c", jb: "d" };
    function dc() { y.call(this, "d"); }
    r(dc, y);
    function ec() { y.call(this, "c"); }
    r(ec, y);
    var fc;
    function gc() { }
    r(gc, ac);
    fc = new gc;
    function K(a, b, c, d) { this.g = a; this.c = b; this.f = c; this.T = d || 1; this.J = new E(this); this.P = hc; a = Ja ? 125 : void 0; this.R = new Hb(a); this.B = null; this.b = !1; this.j = this.l = this.i = this.H = this.u = this.U = this.o = null; this.s = []; this.a = null; this.D = 0; this.h = this.m = null; this.N = -1; this.A = !1; this.O = 0; this.F = null; this.W = this.C = this.V = this.I = !1; }
    var hc = 45E3, ic = {}, jc = {};
    g = K.prototype;
    g.setTimeout = function (a) { this.P = a; };
    function kc(a, b, c) { a.H = 1; a.i = lc(L(b)); a.j = c; a.I = !0; mc(a, null); }
    function mc(a, b) { a.u = q(); M(a); a.l = L(a.i); var c = a.l, d = a.T; Array.isArray(d) || (d = [String(d)]); nc(c.b, "t", d); a.D = 0; a.a = oc(a.g, a.g.C ? b : null); 0 < a.O && (a.F = new Lb(p(a.Ca, a, a.a), a.O)); Nb(a.J, a.a, "readystatechange", a.Wa); b = a.B ? Ba(a.B) : {}; a.j ? (a.m || (a.m = "POST"), b["Content-Type"] = "application/x-www-form-urlencoded", a.a.ba(a.l, a.m, a.j, b)) : (a.m = "GET", a.a.ba(a.l, a.m, null, b)); G(1); Qb(a.c, a.m, a.l, a.f, a.T, a.j); }
    g.Wa = function (a) { a = a.target; var b = this.F; b && 3 == N(a) ? b.f() : this.Ca(a); };
    g.Ca = function (a) {
        try {
            if (a == this.a)
                a: {
                    var b = N(this.a), c = this.a.ua(), d = this.a.X();
                    if (!(3 > b || 3 == b && !Ja && !this.a.$())) {
                        this.A || 4 != b || 7 == c || (8 == c || 0 >= d ? G(3) : G(2));
                        pc(this);
                        var e = this.a.X();
                        this.N = e;
                        var f = this.a.$();
                        this.b = 200 == e;
                        Rb(this.c, this.m, this.l, this.f, this.T, b, e);
                        if (this.b) {
                            if (this.V && !this.C) {
                                b: {
                                    if (this.a) {
                                        var h, m = this.a;
                                        if ((h = m.a ? m.a.getResponseHeader("X-HTTP-Initial-Response") : null) && !ta(h)) {
                                            var l = h;
                                            break b;
                                        }
                                    }
                                    l = null;
                                }
                                if (l)
                                    F(this.c, this.f, l, "Initial handshake response via X-HTTP-Initial-Response"),
                                        this.C = !0, qc(this, l);
                                else {
                                    this.b = !1;
                                    this.h = 3;
                                    H(12);
                                    O(this);
                                    rc(this);
                                    break a;
                                }
                            }
                            this.I ? (tc(this, b, f), Ja && this.b && 3 == b && (Nb(this.J, this.R, "tick", this.Va), this.R.start())) : (F(this.c, this.f, f, null), qc(this, f));
                            4 == b && O(this);
                            this.b && !this.A && (4 == b ? uc(this.g, this) : (this.b = !1, M(this)));
                        }
                        else
                            400 == e && 0 < f.indexOf("Unknown SID") ? (this.h = 3, H(12)) : (this.h = 0, H(13)), O(this), rc(this);
                    }
                }
        }
        catch (t) { }
        finally { }
    };
    function tc(a, b, c) { for (var d = !0; !a.A && a.D < c.length;) {
        var e = vc(a, c);
        if (e == jc) {
            4 == b && (a.h = 4, H(14), d = !1);
            F(a.c, a.f, null, "[Incomplete Response]");
            break;
        }
        else if (e == ic) {
            a.h = 4;
            H(15);
            F(a.c, a.f, c, "[Invalid Chunk]");
            d = !1;
            break;
        }
        else
            F(a.c, a.f, e, null), qc(a, e);
    } 4 == b && 0 == c.length && (a.h = 1, H(16), d = !1); a.b = a.b && d; d ? 0 < c.length && !a.W && (a.W = !0, b = a.g, b.a == a && b.V && !b.F && (b.c.info("Great, no buffering proxy detected. Bytes received: " + c.length), xc(b), b.F = !0)) : (F(a.c, a.f, c, "[Invalid Chunked Response]"), O(a), rc(a)); }
    g.Va = function () { if (this.a) {
        var a = N(this.a), b = this.a.$();
        this.D < b.length && (pc(this), tc(this, a, b), this.b && 4 != a && M(this));
    } };
    function vc(a, b) { var c = a.D, d = b.indexOf("\n", c); if (-1 == d)
        return jc; c = Number(b.substring(c, d)); if (isNaN(c))
        return ic; d += 1; if (d + c > b.length)
        return jc; b = b.substr(d, c); a.D = d + c; return b; }
    g.cancel = function () { this.A = !0; O(this); };
    function M(a) { a.U = q() + a.P; yc(a, a.P); }
    function yc(a, b) { if (null != a.o)
        throw Error("WatchDog timer not null"); a.o = I(p(a.Ua, a), b); }
    function pc(a) { a.o && (k.clearTimeout(a.o), a.o = null); }
    g.Ua = function () { this.o = null; var a = q(); 0 <= a - this.U ? (Tb(this.c, this.l), 2 != this.H && (G(3), H(17)), O(this), this.h = 2, rc(this)) : yc(this, this.U - a); };
    function rc(a) { 0 == a.g.v || a.A || uc(a.g, a); }
    function O(a) { pc(a); var b = a.F; b && "function" == typeof b.ja && b.ja(); a.F = null; Ib(a.R); Ob(a.J); a.a && (b = a.a, a.a = null, b.abort(), b.ja()); }
    function qc(a, b) {
        try {
            var c = a.g;
            if (0 != c.v && (c.a == a || zc(c.b, a)))
                if (c.I = a.N, !a.C && zc(c.b, a) && 3 == c.v) {
                    try {
                        var d = c.ka.a.parse(b);
                    }
                    catch (sc) {
                        d = null;
                    }
                    if (Array.isArray(d) && 3 == d.length) {
                        var e = d;
                        if (0 == e[0])
                            a: {
                                if (!c.j) {
                                    if (c.a)
                                        if (c.a.u + 3E3 < a.u)
                                            Ac(c), Bc(c);
                                        else
                                            break a;
                                    Cc(c);
                                    H(18);
                                }
                            }
                        else
                            c.oa = e[1], 0 < c.oa - c.P && 37500 > e[2] && c.H && 0 == c.o && !c.m && (c.m = I(p(c.Ra, c), 6E3));
                        if (1 >= Dc(c.b) && c.ea) {
                            try {
                                c.ea();
                            }
                            catch (sc) { }
                            c.ea = void 0;
                        }
                    }
                    else
                        P(c, 11);
                }
                else if ((a.C || c.a == a) && Ac(c), !ta(b))
                    for (b = d = c.ka.a.parse(b), d = 0; d < b.length; d++)
                        if (e =
                            b[d], c.P = e[0], e = e[1], 2 == c.v)
                            if ("c" == e[0]) {
                                c.J = e[1];
                                c.ga = e[2];
                                var f = e[3];
                                null != f && (c.ha = f, c.c.info("VER=" + c.ha));
                                var h = e[4];
                                null != h && (c.pa = h, c.c.info("SVER=" + c.pa));
                                var m = e[5];
                                if (null != m && "number" === typeof m && 0 < m) {
                                    var l = 1.5 * m;
                                    c.D = l;
                                    c.c.info("backChannelRequestTimeoutMs_=" + l);
                                }
                                l = c;
                                var t = a.a;
                                if (t) {
                                    var B = t.a ? t.a.getResponseHeader("X-Client-Wire-Protocol") : null;
                                    if (B) {
                                        var z = l.b;
                                        !z.a && (v(B, "spdy") || v(B, "quic") || v(B, "h2")) && (z.f = z.g, z.a = new Set, z.b && (Ec(z, z.b), z.b = null));
                                    }
                                    if (l.A) {
                                        var qb = t.a ? t.a.getResponseHeader("X-HTTP-Session-Id") :
                                            null;
                                        qb && (l.na = qb, Q(l.B, l.A, qb));
                                    }
                                }
                                c.v = 3;
                                c.f && c.f.ta();
                                c.V && (c.N = q() - a.u, c.c.info("Handshake RTT: " + c.N + "ms"));
                                l = c;
                                var va = a;
                                l.la = Fc(l, l.C ? l.ga : null, l.fa);
                                if (va.C) {
                                    Gc(l.b, va);
                                    var wa = va, wc = l.D;
                                    wc && wa.setTimeout(wc);
                                    wa.o && (pc(wa), M(wa));
                                    l.a = va;
                                }
                                else
                                    Hc(l);
                                0 < c.g.length && Ic(c);
                            }
                            else
                                "stop" != e[0] && "close" != e[0] || P(c, 7);
                        else
                            3 == c.v && ("stop" == e[0] || "close" == e[0] ? "stop" == e[0] ? P(c, 7) : Jc(c) : "noop" != e[0] && c.f && c.f.sa(e), c.o = 0);
            G(4);
        }
        catch (sc) { }
    }
    function Kc(a) { if (a.K && "function" == typeof a.K)
        return a.K(); if ("string" === typeof a)
        return a.split(""); if (ca(a)) {
        for (var b = [], c = a.length, d = 0; d < c; d++)
            b.push(a[d]);
        return b;
    } b = []; c = 0; for (d in a)
        b[c++] = a[d]; return a = b; }
    function Lc(a, b) { if (a.forEach && "function" == typeof a.forEach)
        a.forEach(b, void 0);
    else if (ca(a) || "string" === typeof a)
        oa(a, b, void 0);
    else {
        if (a.L && "function" == typeof a.L)
            var c = a.L();
        else if (a.K && "function" == typeof a.K)
            c = void 0;
        else if (ca(a) || "string" === typeof a) {
            c = [];
            for (var d = a.length, e = 0; e < d; e++)
                c.push(e);
        }
        else
            for (e in c = [], d = 0, a)
                c[d++] = e;
        d = Kc(a);
        e = d.length;
        for (var f = 0; f < e; f++)
            b.call(void 0, d[f], c && c[f], a);
    } }
    function R(a, b) { this.b = {}; this.a = []; this.c = 0; var c = arguments.length; if (1 < c) {
        if (c % 2)
            throw Error("Uneven number of arguments");
        for (var d = 0; d < c; d += 2)
            this.set(arguments[d], arguments[d + 1]);
    }
    else if (a)
        if (a instanceof R)
            for (c = a.L(), d = 0; d < c.length; d++)
                this.set(c[d], a.get(c[d]));
        else
            for (d in a)
                this.set(d, a[d]); }
    g = R.prototype;
    g.K = function () { Mc(this); for (var a = [], b = 0; b < this.a.length; b++)
        a.push(this.b[this.a[b]]); return a; };
    g.L = function () { Mc(this); return this.a.concat(); };
    function Mc(a) { if (a.c != a.a.length) {
        for (var b = 0, c = 0; b < a.a.length;) {
            var d = a.a[b];
            S(a.b, d) && (a.a[c++] = d);
            b++;
        }
        a.a.length = c;
    } if (a.c != a.a.length) {
        var e = {};
        for (c = b = 0; b < a.a.length;)
            d = a.a[b], S(e, d) || (a.a[c++] = d, e[d] = 1), b++;
        a.a.length = c;
    } }
    g.get = function (a, b) { return S(this.b, a) ? this.b[a] : b; };
    g.set = function (a, b) { S(this.b, a) || (this.c++, this.a.push(a)); this.b[a] = b; };
    g.forEach = function (a, b) { for (var c = this.L(), d = 0; d < c.length; d++) {
        var e = c[d], f = this.get(e);
        a.call(b, f, e, this);
    } };
    function S(a, b) { return Object.prototype.hasOwnProperty.call(a, b); }
    var Nc = /^(?:([^:/?#.]+):)?(?:\/\/(?:([^\\/?#]*)@)?([^\\/?#]*?)(?::([0-9]+))?(?=[\\/?#]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;
    function Oc(a, b) { if (a) {
        a = a.split("&");
        for (var c = 0; c < a.length; c++) {
            var d = a[c].indexOf("="), e = null;
            if (0 <= d) {
                var f = a[c].substring(0, d);
                e = a[c].substring(d + 1);
            }
            else
                f = a[c];
            b(f, e ? decodeURIComponent(e.replace(/\+/g, " ")) : "");
        }
    } }
    function T(a, b) { this.c = this.j = this.f = ""; this.h = null; this.i = this.g = ""; this.a = !1; if (a instanceof T) {
        this.a = void 0 !== b ? b : a.a;
        Pc(this, a.f);
        this.j = a.j;
        Qc(this, a.c);
        Rc(this, a.h);
        this.g = a.g;
        b = a.b;
        var c = new U;
        c.c = b.c;
        b.a && (c.a = new R(b.a), c.b = b.b);
        Sc(this, c);
        this.i = a.i;
    }
    else
        a && (c = String(a).match(Nc)) ? (this.a = !!b, Pc(this, c[1] || "", !0), this.j = Tc(c[2] || ""), Qc(this, c[3] || "", !0), Rc(this, c[4]), this.g = Tc(c[5] || "", !0), Sc(this, c[6] || "", !0), this.i = Tc(c[7] || "")) : (this.a = !!b, this.b = new U(null, this.a)); }
    T.prototype.toString = function () { var a = [], b = this.f; b && a.push(Uc(b, Vc, !0), ":"); var c = this.c; if (c || "file" == b)
        a.push("//"), (b = this.j) && a.push(Uc(b, Vc, !0), "@"), a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), c = this.h, null != c && a.push(":", String(c)); if (c = this.g)
        this.c && "/" != c.charAt(0) && a.push("/"), a.push(Uc(c, "/" == c.charAt(0) ? Wc : Xc, !0)); (c = this.b.toString()) && a.push("?", c); (c = this.i) && a.push("#", Uc(c, Yc)); return a.join(""); };
    function L(a) { return new T(a); }
    function Pc(a, b, c) { a.f = c ? Tc(b, !0) : b; a.f && (a.f = a.f.replace(/:$/, "")); }
    function Qc(a, b, c) { a.c = c ? Tc(b, !0) : b; }
    function Rc(a, b) { if (b) {
        b = Number(b);
        if (isNaN(b) || 0 > b)
            throw Error("Bad port number " + b);
        a.h = b;
    }
    else
        a.h = null; }
    function Sc(a, b, c) { b instanceof U ? (a.b = b, Zc(a.b, a.a)) : (c || (b = Uc(b, $c)), a.b = new U(b, a.a)); }
    function Q(a, b, c) { a.b.set(b, c); }
    function lc(a) { Q(a, "zx", Math.floor(2147483648 * Math.random()).toString(36) + Math.abs(Math.floor(2147483648 * Math.random()) ^ q()).toString(36)); return a; }
    function ad(a) { return a instanceof T ? L(a) : new T(a, void 0); }
    function bd(a, b, c, d) { var e = new T(null, void 0); a && Pc(e, a); b && Qc(e, b); c && Rc(e, c); d && (e.g = d); return e; }
    function Tc(a, b) { return a ? b ? decodeURI(a.replace(/%25/g, "%2525")) : decodeURIComponent(a) : ""; }
    function Uc(a, b, c) { return "string" === typeof a ? (a = encodeURI(a).replace(b, cd), c && (a = a.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), a) : null; }
    function cd(a) { a = a.charCodeAt(0); return "%" + (a >> 4 & 15).toString(16) + (a & 15).toString(16); }
    var Vc = /[#\/\?@]/g, Xc = /[#\?:]/g, Wc = /[#\?]/g, $c = /[#\?@]/g, Yc = /#/g;
    function U(a, b) { this.b = this.a = null; this.c = a || null; this.f = !!b; }
    function V(a) { a.a || (a.a = new R, a.b = 0, a.c && Oc(a.c, function (b, c) { a.add(decodeURIComponent(b.replace(/\+/g, " ")), c); })); }
    g = U.prototype;
    g.add = function (a, b) { V(this); this.c = null; a = W(this, a); var c = this.a.get(a); c || this.a.set(a, c = []); c.push(b); this.b += 1; return this; };
    function dd(a, b) { V(a); b = W(a, b); S(a.a.b, b) && (a.c = null, a.b -= a.a.get(b).length, a = a.a, S(a.b, b) && (delete a.b[b], a.c--, a.a.length > 2 * a.c && Mc(a))); }
    function ed(a, b) { V(a); b = W(a, b); return S(a.a.b, b); }
    g.forEach = function (a, b) { V(this); this.a.forEach(function (c, d) { oa(c, function (e) { a.call(b, e, d, this); }, this); }, this); };
    g.L = function () { V(this); for (var a = this.a.K(), b = this.a.L(), c = [], d = 0; d < b.length; d++)
        for (var e = a[d], f = 0; f < e.length; f++)
            c.push(b[d]); return c; };
    g.K = function (a) { V(this); var b = []; if ("string" === typeof a)
        ed(this, a) && (b = ra(b, this.a.get(W(this, a))));
    else {
        a = this.a.K();
        for (var c = 0; c < a.length; c++)
            b = ra(b, a[c]);
    } return b; };
    g.set = function (a, b) { V(this); this.c = null; a = W(this, a); ed(this, a) && (this.b -= this.a.get(a).length); this.a.set(a, [b]); this.b += 1; return this; };
    g.get = function (a, b) { if (!a)
        return b; a = this.K(a); return 0 < a.length ? String(a[0]) : b; };
    function nc(a, b, c) { dd(a, b); 0 < c.length && (a.c = null, a.a.set(W(a, b), sa(c)), a.b += c.length); }
    g.toString = function () { if (this.c)
        return this.c; if (!this.a)
        return ""; for (var a = [], b = this.a.L(), c = 0; c < b.length; c++) {
        var d = b[c], e = encodeURIComponent(String(d));
        d = this.K(d);
        for (var f = 0; f < d.length; f++) {
            var h = e;
            "" !== d[f] && (h += "=" + encodeURIComponent(String(d[f])));
            a.push(h);
        }
    } return this.c = a.join("&"); };
    function W(a, b) { b = String(b); a.f && (b = b.toLowerCase()); return b; }
    function Zc(a, b) { b && !a.f && (V(a), a.c = null, a.a.forEach(function (c, d) { var e = d.toLowerCase(); d != e && (dd(this, d), nc(this, e, c)); }, a)); a.f = b; }
    function fd(a, b) { this.b = a; this.a = b; }
    function gd(a) { this.g = a || hd; k.PerformanceNavigationTiming ? (a = k.performance.getEntriesByType("navigation"), a = 0 < a.length && ("hq" == a[0].nextHopProtocol || "h2" == a[0].nextHopProtocol)) : a = !!(k.ia && k.ia.ya && k.ia.ya() && k.ia.ya().qb); this.f = a ? this.g : 1; this.a = null; 1 < this.f && (this.a = new Set); this.b = null; this.c = []; }
    var hd = 10;
    function id(a) { return a.b ? !0 : a.a ? a.a.size >= a.f : !1; }
    function Dc(a) { return a.b ? 1 : a.a ? a.a.size : 0; }
    function zc(a, b) { return a.b ? a.b == b : a.a ? a.a.has(b) : !1; }
    function Ec(a, b) { a.a ? a.a.add(b) : a.b = b; }
    function Gc(a, b) { a.b && a.b == b ? a.b = null : a.a && a.a.has(b) && a.a.delete(b); }
    gd.prototype.cancel = function () {
        var e_1, _a;
        this.c = jd(this);
        if (this.b)
            this.b.cancel(), this.b = null;
        else if (this.a && 0 !== this.a.size) {
            try {
                for (var _b = __values$1(this.a.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var a = _c.value;
                    a.cancel();
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.a.clear();
        }
    };
    function jd(a) {
        var e_2, _a;
        if (null != a.b)
            return a.c.concat(a.b.s);
        if (null != a.a && 0 !== a.a.size) {
            var b = a.c;
            try {
                for (var _b = __values$1(a.a.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var c = _c.value;
                    b = b.concat(c.s);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return b;
        }
        return sa(a.c);
    }
    function kd() { }
    kd.prototype.stringify = function (a) { return k.JSON.stringify(a, void 0); };
    kd.prototype.parse = function (a) { return k.JSON.parse(a, void 0); };
    function ld() { this.a = new kd; }
    function md(a, b, c) { var d = c || ""; try {
        Lc(a, function (e, f) { var h = e; n(e) && (h = vb(e)); b.push(d + f + "=" + encodeURIComponent(h)); });
    }
    catch (e) {
        throw b.push(d + "type=" + encodeURIComponent("_badmap")), e;
    } }
    function nd(a, b) { var c = new Pb; if (k.Image) {
        var d = new Image;
        d.onload = ka(od, c, d, "TestLoadImage: loaded", !0, b);
        d.onerror = ka(od, c, d, "TestLoadImage: error", !1, b);
        d.onabort = ka(od, c, d, "TestLoadImage: abort", !1, b);
        d.ontimeout = ka(od, c, d, "TestLoadImage: timeout", !1, b);
        k.setTimeout(function () { if (d.ontimeout)
            d.ontimeout(); }, 1E4);
        d.src = a;
    }
    else
        b(!1); }
    function od(a, b, c, d, e) { try {
        b.onload = null, b.onerror = null, b.onabort = null, b.ontimeout = null, e(d);
    }
    catch (f) { } }
    var pd = k.JSON.parse;
    function X(a) { D.call(this); this.headers = new R; this.H = a || null; this.b = !1; this.s = this.a = null; this.B = ""; this.h = 0; this.f = ""; this.g = this.A = this.l = this.u = !1; this.o = 0; this.m = null; this.I = qd; this.D = this.F = !1; }
    r(X, D);
    var qd = "", rd = /^https?$/i, sd = ["POST", "PUT"];
    g = X.prototype;
    g.ba = function (a, b, c, d) {
        if (this.a)
            throw Error("[goog.net.XhrIo] Object is active with another request=" + this.B + "; newUri=" + a);
        b = b ? b.toUpperCase() : "GET";
        this.B = a;
        this.f = "";
        this.h = 0;
        this.u = !1;
        this.b = !0;
        this.a = new XMLHttpRequest;
        this.s = this.H ? bc(this.H) : bc(fc);
        this.a.onreadystatechange = p(this.za, this);
        try {
            this.A = !0, this.a.open(b, String(a), !0), this.A = !1;
        }
        catch (f) {
            td(this, f);
            return;
        }
        a = c || "";
        var e = new R(this.headers);
        d && Lc(d, function (f, h) { e.set(h, f); });
        d = pa(e.L());
        c = k.FormData && a instanceof k.FormData;
        !(0 <=
            na(sd, b)) || d || c || e.set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
        e.forEach(function (f, h) { this.a.setRequestHeader(h, f); }, this);
        this.I && (this.a.responseType = this.I);
        "withCredentials" in this.a && this.a.withCredentials !== this.F && (this.a.withCredentials = this.F);
        try {
            ud(this), 0 < this.o && ((this.D = vd(this.a)) ? (this.a.timeout = this.o, this.a.ontimeout = p(this.xa, this)) : this.m = Jb(this.xa, this.o, this)), this.l = !0, this.a.send(a), this.l = !1;
        }
        catch (f) {
            td(this, f);
        }
    };
    function vd(a) { return x && Ra(9) && "number" === typeof a.timeout && void 0 !== a.ontimeout; }
    function qa(a) { return "content-type" == a.toLowerCase(); }
    g.xa = function () { "undefined" != typeof goog && this.a && (this.f = "Timed out after " + this.o + "ms, aborting", this.h = 8, this.dispatchEvent("timeout"), this.abort(8)); };
    function td(a, b) { a.b = !1; a.a && (a.g = !0, a.a.abort(), a.g = !1); a.f = b; a.h = 5; wd(a); xd(a); }
    function wd(a) { a.u || (a.u = !0, a.dispatchEvent("complete"), a.dispatchEvent("error")); }
    g.abort = function (a) { this.a && this.b && (this.b = !1, this.g = !0, this.a.abort(), this.g = !1, this.h = a || 7, this.dispatchEvent("complete"), this.dispatchEvent("abort"), xd(this)); };
    g.G = function () { this.a && (this.b && (this.b = !1, this.g = !0, this.a.abort(), this.g = !1), xd(this, !0)); X.S.G.call(this); };
    g.za = function () { this.j || (this.A || this.l || this.g ? yd(this) : this.Ta()); };
    g.Ta = function () { yd(this); };
    function yd(a) {
        if (a.b && "undefined" != typeof goog && (!a.s[1] || 4 != N(a) || 2 != a.X()))
            if (a.l && 4 == N(a))
                Jb(a.za, 0, a);
            else if (a.dispatchEvent("readystatechange"), 4 == N(a)) {
                a.b = !1;
                try {
                    var b = a.X();
                    a: switch (b) {
                        case 200:
                        case 201:
                        case 202:
                        case 204:
                        case 206:
                        case 304:
                        case 1223:
                            var c = !0;
                            break a;
                        default: c = !1;
                    }
                    var d;
                    if (!(d = c)) {
                        var e;
                        if (e = 0 === b) {
                            var f = String(a.B).match(Nc)[1] || null;
                            if (!f && k.self && k.self.location) {
                                var h = k.self.location.protocol;
                                f = h.substr(0, h.length - 1);
                            }
                            e = !rd.test(f ? f.toLowerCase() : "");
                        }
                        d = e;
                    }
                    if (d)
                        a.dispatchEvent("complete"),
                            a.dispatchEvent("success");
                    else {
                        a.h = 6;
                        try {
                            var m = 2 < N(a) ? a.a.statusText : "";
                        }
                        catch (l) {
                            m = "";
                        }
                        a.f = m + " [" + a.X() + "]";
                        wd(a);
                    }
                }
                finally {
                    xd(a);
                }
            }
    }
    function xd(a, b) { if (a.a) {
        ud(a);
        var c = a.a, d = a.s[0] ? aa : null;
        a.a = null;
        a.s = null;
        b || a.dispatchEvent("ready");
        try {
            c.onreadystatechange = d;
        }
        catch (e) { }
    } }
    function ud(a) { a.a && a.D && (a.a.ontimeout = null); a.m && (k.clearTimeout(a.m), a.m = null); }
    function N(a) { return a.a ? a.a.readyState : 0; }
    g.X = function () { try {
        return 2 < N(this) ? this.a.status : -1;
    }
    catch (a) {
        return -1;
    } };
    g.$ = function () { try {
        return this.a ? this.a.responseText : "";
    }
    catch (a) {
        return "";
    } };
    g.Na = function (a) { if (this.a) {
        var b = this.a.responseText;
        a && 0 == b.indexOf(a) && (b = b.substring(a.length));
        return pd(b);
    } };
    g.ua = function () { return this.h; };
    g.Qa = function () { return "string" === typeof this.f ? this.f : String(this.f); };
    function zd(a) { var b = ""; Aa(a, function (c, d) { b += d; b += ":"; b += c; b += "\r\n"; }); return b; }
    function Ad(a, b, c) { a: {
        for (d in c) {
            var d = !1;
            break a;
        }
        d = !0;
    } d || (c = zd(c), "string" === typeof a ? (null != c && encodeURIComponent(String(c))) : Q(a, b, c)); }
    function Bd(a, b, c) { return c && c.internalChannelParams ? c.internalChannelParams[a] || b : b; }
    function Cd(a) {
        this.pa = 0;
        this.g = [];
        this.c = new Pb;
        this.ga = this.la = this.B = this.fa = this.a = this.na = this.A = this.W = this.i = this.O = this.l = null;
        this.La = this.R = 0;
        this.Ia = Bd("failFast", !1, a);
        this.H = this.m = this.j = this.h = this.f = null;
        this.T = !0;
        this.I = this.oa = this.P = -1;
        this.U = this.o = this.u = 0;
        this.Fa = Bd("baseRetryDelayMs", 5E3, a);
        this.Ma = Bd("retryDelaySeedMs", 1E4, a);
        this.Ja = Bd("forwardChannelMaxRetries", 2, a);
        this.ma = Bd("forwardChannelRequestTimeoutMs", 2E4, a);
        this.Ka = a && a.g || void 0;
        this.D = void 0;
        this.C = a && a.supportsCrossDomainXhr ||
            !1;
        this.J = "";
        this.b = new gd(a && a.concurrentRequestLimit);
        this.ka = new ld;
        this.da = a && a.fastHandshake || !1;
        this.Ga = a && a.b || !1;
        a && a.f && (this.c.a = !1);
        a && a.forceLongPolling && (this.T = !1);
        this.V = !this.da && this.T && a && a.c || !1;
        this.ea = void 0;
        this.N = 0;
        this.F = !1;
        this.s = null;
    }
    g = Cd.prototype;
    g.ha = 8;
    g.v = 1;
    function Jc(a) { Dd(a); if (3 == a.v) {
        var b = a.R++, c = L(a.B);
        Q(c, "SID", a.J);
        Q(c, "RID", b);
        Q(c, "TYPE", "terminate");
        Ed(a, c);
        b = new K(a, a.c, b, void 0);
        b.H = 2;
        b.i = lc(L(c));
        c = !1;
        k.navigator && k.navigator.sendBeacon && (c = k.navigator.sendBeacon(b.i.toString(), ""));
        !c && k.Image && ((new Image).src = b.i, c = !0);
        c || (b.a = oc(b.g, null), b.a.ba(b.i));
        b.u = q();
        M(b);
    } Fd(a); }
    function Bc(a) { a.a && (xc(a), a.a.cancel(), a.a = null); }
    function Dd(a) { Bc(a); a.j && (k.clearTimeout(a.j), a.j = null); Ac(a); a.b.cancel(); a.h && ("number" === typeof a.h && k.clearTimeout(a.h), a.h = null); }
    function Gd(a, b) { a.g.push(new fd(a.La++, b)); 3 == a.v && Ic(a); }
    function Ic(a) { id(a.b) || a.h || (a.h = !0, Cb(a.Ba, a), a.u = 0); }
    function Hd(a, b) { if (Dc(a.b) >= a.b.f - (a.h ? 1 : 0))
        return !1; if (a.h)
        return a.g = b.s.concat(a.g), !0; if (1 == a.v || 2 == a.v || a.u >= (a.Ia ? 0 : a.Ja))
        return !1; a.h = I(p(a.Ba, a, b), Id(a, a.u)); a.u++; return !0; }
    g.Ba = function (a) {
        if (this.h)
            if (this.h = null, 1 == this.v) {
                if (!a) {
                    this.R = Math.floor(1E5 * Math.random());
                    a = this.R++;
                    var b = new K(this, this.c, a, void 0), c = this.l;
                    this.O && (c ? (c = Ba(c), Da(c, this.O)) : c = this.O);
                    null === this.i && (b.B = c);
                    var d;
                    if (this.da)
                        a: {
                            for (var e = d = 0; e < this.g.length; e++) {
                                b: {
                                    var f = this.g[e];
                                    if ("__data__" in f.a && (f = f.a.__data__, "string" === typeof f)) {
                                        f = f.length;
                                        break b;
                                    }
                                    f = void 0;
                                }
                                if (void 0 === f)
                                    break;
                                d += f;
                                if (4096 < d) {
                                    d = e;
                                    break a;
                                }
                                if (4096 === d || e === this.g.length - 1) {
                                    d = e + 1;
                                    break a;
                                }
                            }
                            d = 1E3;
                        }
                    else
                        d = 1E3;
                    d = Jd(this, b, d);
                    e = L(this.B);
                    Q(e, "RID", a);
                    Q(e, "CVER", 22);
                    this.A && Q(e, "X-HTTP-Session-Id", this.A);
                    Ed(this, e);
                    this.i && c && Ad(e, this.i, c);
                    Ec(this.b, b);
                    this.Ga && Q(e, "TYPE", "init");
                    this.da ? (Q(e, "$req", d), Q(e, "SID", "null"), b.V = !0, kc(b, e, null)) : kc(b, e, d);
                    this.v = 2;
                }
            }
            else
                3 == this.v && (a ? Kd(this, a) : 0 == this.g.length || id(this.b) || Kd(this));
    };
    function Kd(a, b) { var c; b ? c = b.f : c = a.R++; var d = L(a.B); Q(d, "SID", a.J); Q(d, "RID", c); Q(d, "AID", a.P); Ed(a, d); a.i && a.l && Ad(d, a.i, a.l); c = new K(a, a.c, c, a.u + 1); null === a.i && (c.B = a.l); b && (a.g = b.s.concat(a.g)); b = Jd(a, c, 1E3); c.setTimeout(Math.round(.5 * a.ma) + Math.round(.5 * a.ma * Math.random())); Ec(a.b, c); kc(c, d, b); }
    function Ed(a, b) { a.f && Lc({}, function (c, d) { Q(b, d, c); }); }
    function Jd(a, b, c) { c = Math.min(a.g.length, c); var d = a.f ? p(a.f.Ha, a.f, a) : null; a: for (var e = a.g, f = -1;;) {
        var h = ["count=" + c];
        -1 == f ? 0 < c ? (f = e[0].b, h.push("ofs=" + f)) : f = 0 : h.push("ofs=" + f);
        for (var m = !0, l = 0; l < c; l++) {
            var t = e[l].b, B = e[l].a;
            t -= f;
            if (0 > t)
                f = Math.max(0, e[l].b - 100), m = !1;
            else
                try {
                    md(B, h, "req" + t + "_");
                }
                catch (z) {
                    d && d(B);
                }
        }
        if (m) {
            d = h.join("&");
            break a;
        }
    } a = a.g.splice(0, c); b.s = a; return d; }
    function Hc(a) { a.a || a.j || (a.U = 1, Cb(a.Aa, a), a.o = 0); }
    function Cc(a) { if (a.a || a.j || 3 <= a.o)
        return !1; a.U++; a.j = I(p(a.Aa, a), Id(a, a.o)); a.o++; return !0; }
    g.Aa = function () { this.j = null; Ld(this); if (this.V && !(this.F || null == this.a || 0 >= this.N)) {
        var a = 2 * this.N;
        this.c.info("BP detection timer enabled: " + a);
        this.s = I(p(this.Sa, this), a);
    } };
    g.Sa = function () { this.s && (this.s = null, this.c.info("BP detection timeout reached."), this.c.info("Buffering proxy detected and switch to long-polling!"), this.H = !1, this.F = !0, Bc(this), Ld(this)); };
    function xc(a) { null != a.s && (k.clearTimeout(a.s), a.s = null); }
    function Ld(a) { a.a = new K(a, a.c, "rpc", a.U); null === a.i && (a.a.B = a.l); a.a.O = 0; var b = L(a.la); Q(b, "RID", "rpc"); Q(b, "SID", a.J); Q(b, "CI", a.H ? "0" : "1"); Q(b, "AID", a.P); Ed(a, b); Q(b, "TYPE", "xmlhttp"); a.i && a.l && Ad(b, a.i, a.l); a.D && a.a.setTimeout(a.D); var c = a.a; a = a.ga; c.H = 1; c.i = lc(L(b)); c.j = null; c.I = !0; mc(c, a); }
    g.Ra = function () { null != this.m && (this.m = null, Bc(this), Cc(this), H(19)); };
    function Ac(a) { null != a.m && (k.clearTimeout(a.m), a.m = null); }
    function uc(a, b) { var c = null; if (a.a == b) {
        Ac(a);
        xc(a);
        a.a = null;
        var d = 2;
    }
    else if (zc(a.b, b))
        c = b.s, Gc(a.b, b), d = 1;
    else
        return; a.I = b.N; if (0 != a.v)
        if (b.b)
            if (1 == d) {
                c = b.j ? b.j.length : 0;
                b = q() - b.u;
                var e = a.u;
                d = Vb();
                d.dispatchEvent(new Yb(d, c, b, e));
                Ic(a);
            }
            else
                Hc(a);
        else if (e = b.h, 3 == e || 0 == e && 0 < a.I || !(1 == d && Hd(a, b) || 2 == d && Cc(a)))
            switch (c && 0 < c.length && (b = a.b, b.c = b.c.concat(c)), e) {
                case 1:
                    P(a, 5);
                    break;
                case 4:
                    P(a, 10);
                    break;
                case 3:
                    P(a, 6);
                    break;
                default: P(a, 2);
            } }
    function Id(a, b) { var c = a.Fa + Math.floor(Math.random() * a.Ma); a.f || (c *= 2); return c * b; }
    function P(a, b) { a.c.info("Error code " + b); if (2 == b) {
        var c = null;
        a.f && (c = null);
        var d = p(a.Xa, a);
        c || (c = new T("//www.google.com/images/cleardot.gif"), k.location && "http" == k.location.protocol || Pc(c, "https"), lc(c));
        nd(c.toString(), d);
    }
    else
        H(2); a.v = 0; a.f && a.f.ra(b); Fd(a); Dd(a); }
    g.Xa = function (a) { a ? (this.c.info("Successfully pinged google.com"), H(2)) : (this.c.info("Failed to ping google.com"), H(1)); };
    function Fd(a) { a.v = 0; a.I = -1; if (a.f) {
        if (0 != jd(a.b).length || 0 != a.g.length)
            a.b.c.length = 0, sa(a.g), a.g.length = 0;
        a.f.qa();
    } }
    function Fc(a, b, c) { var d = ad(c); if ("" != d.c)
        b && Qc(d, b + "." + d.c), Rc(d, d.h);
    else {
        var e = k.location;
        d = bd(e.protocol, b ? b + "." + e.hostname : e.hostname, +e.port, c);
    } a.W && Aa(a.W, function (f, h) { Q(d, h, f); }); b = a.A; c = a.na; b && c && Q(d, b, c); Q(d, "VER", a.ha); Ed(a, d); return d; }
    function oc(a, b) { if (b && !a.C)
        throw Error("Can't create secondary domain capable XhrIo object."); b = new X(a.Ka); b.F = a.C; return b; }
    function Md() { }
    g = Md.prototype;
    g.ta = function () { };
    g.sa = function () { };
    g.ra = function () { };
    g.qa = function () { };
    g.Ha = function () { };
    function Nd() { if (x && !(10 <= Number(Ua)))
        throw Error("Environmental error: no available transport."); }
    Nd.prototype.a = function (a, b) { return new Y(a, b); };
    function Y(a, b) {
        D.call(this);
        this.a = new Cd(b);
        this.l = a;
        this.b = b && b.messageUrlParams || null;
        a = b && b.messageHeaders || null;
        b && b.clientProtocolHeaderRequired && (a ? a["X-Client-Protocol"] = "webchannel" : a = { "X-Client-Protocol": "webchannel" });
        this.a.l = a;
        a = b && b.initMessageHeaders || null;
        b && b.messageContentType && (a ? a["X-WebChannel-Content-Type"] = b.messageContentType : a = { "X-WebChannel-Content-Type": b.messageContentType });
        b && b.a && (a ? a["X-WebChannel-Client-Profile"] = b.a : a = { "X-WebChannel-Client-Profile": b.a });
        this.a.O =
            a;
        (a = b && b.httpHeadersOverwriteParam) && !ta(a) && (this.a.i = a);
        this.h = b && b.supportsCrossDomainXhr || !1;
        this.g = b && b.sendRawJson || !1;
        (b = b && b.httpSessionIdParam) && !ta(b) && (this.a.A = b, a = this.b, null !== a && b in a && (a = this.b, b in a && delete a[b]));
        this.f = new Z(this);
    }
    r(Y, D);
    g = Y.prototype;
    g.addEventListener = function (a, b, c, d) { Y.S.addEventListener.call(this, a, b, c, d); };
    g.removeEventListener = function (a, b, c, d) { Y.S.removeEventListener.call(this, a, b, c, d); };
    g.Oa = function () { this.a.f = this.f; this.h && (this.a.C = !0); var a = this.a, b = this.l, c = this.b || void 0; H(0); a.fa = b; a.W = c || {}; a.H = a.T; a.B = Fc(a, null, a.fa); Ic(a); };
    g.close = function () { Jc(this.a); };
    g.Pa = function (a) { if ("string" === typeof a) {
        var b = {};
        b.__data__ = a;
        Gd(this.a, b);
    }
    else
        this.g ? (b = {}, b.__data__ = vb(a), Gd(this.a, b)) : Gd(this.a, a); };
    g.G = function () { this.a.f = null; delete this.f; Jc(this.a); delete this.a; Y.S.G.call(this); };
    function Od(a) { dc.call(this); var b = a.__sm__; if (b) {
        a: {
            for (var c in b) {
                a = c;
                break a;
            }
            a = void 0;
        }
        (this.c = a) ? (a = this.c, this.data = null !== b && a in b ? b[a] : void 0) : this.data = b;
    }
    else
        this.data = a; }
    r(Od, dc);
    function Pd() { ec.call(this); this.status = 1; }
    r(Pd, ec);
    function Z(a) { this.a = a; }
    r(Z, Md);
    Z.prototype.ta = function () { this.a.dispatchEvent("a"); };
    Z.prototype.sa = function (a) { this.a.dispatchEvent(new Od(a)); };
    Z.prototype.ra = function (a) { this.a.dispatchEvent(new Pd(a)); };
    Z.prototype.qa = function () { this.a.dispatchEvent("b"); }; /*

     Copyright 2017 Google LLC

     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License.
    */
    Nd.prototype.createWebChannel = Nd.prototype.a;
    Y.prototype.send = Y.prototype.Pa;
    Y.prototype.open = Y.prototype.Oa;
    Y.prototype.close = Y.prototype.close;
    Zb.NO_ERROR = 0;
    Zb.TIMEOUT = 8;
    Zb.HTTP_ERROR = 6;
    $b.COMPLETE = "complete";
    cc.EventType = J;
    J.OPEN = "a";
    J.CLOSE = "b";
    J.ERROR = "c";
    J.MESSAGE = "d";
    D.prototype.listen = D.prototype.va;
    X.prototype.listenOnce = X.prototype.wa;
    X.prototype.getLastError = X.prototype.Qa;
    X.prototype.getLastErrorCode = X.prototype.ua;
    X.prototype.getStatus = X.prototype.X;
    X.prototype.getResponseJson = X.prototype.Na;
    X.prototype.getResponseText = X.prototype.$;
    X.prototype.send = X.prototype.ba;
    var createWebChannelTransport = function () { return new Nd; };
    var ErrorCode = Zb;
    var EventType = $b;
    var WebChannel = cc;
    var XhrIo = X;

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var b = 
    /**
         * Constructs a DatabaseInfo using the provided host, databaseId and
         * persistenceKey.
         *
         * @param databaseId The database to use.
         * @param persistenceKey A unique identifier for this Firestore's local
         * storage (used in conjunction with the databaseId).
         * @param host The Firestore backend host to connect to.
         * @param ssl Whether to use SSL when connecting.
         * @param forceLongPolling Whether to use the forceLongPolling option
         * when using WebChannel as the network transport.
         * @param autoDetectLongPolling Whether to use the detectBufferingProxy
         * option when using WebChannel as the network transport.
         */
    function(t, e, n, r, i, o) {
        this.t = t, this.persistenceKey = e, this.host = n, this.ssl = r, this.forceLongPolling = i, 
        this.i = o;
    }, _ = /** @class */ function() {
        function t(t, e) {
            this.projectId = t, this.database = e || "(default)";
        }
        return Object.defineProperty(t.prototype, "o", {
            get: function() {
                return "(default)" === this.database;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(e) {
            return e instanceof t && e.projectId === this.projectId && e.database === this.database;
        }, t;
    }(), I$1 = new Logger("@firebase/firestore");

    /** The default database name for a project. */
    /** Represents the database ID a Firestore client is associated with. */
    // Helper methods are needed because variables can't be exported as read/write
    function E$1() {
        return I$1.logLevel;
    }

    /**
     * Sets the verbosity of Cloud Firestore logs (debug, error, or silent).
     *
     * @param logLevel
     *   The verbosity you set for activity and error logging. Can be any of
     *   the following values:
     *
     *   <ul>
     *     <li>`debug` for the most verbose logging level, primarily for
     *     debugging.</li>
     *     <li>`error` to log errors only.</li>
     *     <li><code>`silent` to turn off logging.</li>
     *   </ul>
     */ function T$1(t) {
        for (var e = [], n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
        if (I$1.logLevel <= LogLevel.DEBUG) {
            var i = e.map(A$1);
            I$1.debug.apply(I$1, __spreadArrays([ "Firestore (8.0.2): " + t ], i));
        }
    }

    function N$1(t) {
        for (var e = [], n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
        if (I$1.logLevel <= LogLevel.ERROR) {
            var i = e.map(A$1);
            I$1.error.apply(I$1, __spreadArrays([ "Firestore (8.0.2): " + t ], i));
        }
    }

    function x$1(t) {
        for (var e = [], n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
        if (I$1.logLevel <= LogLevel.WARN) {
            var i = e.map(A$1);
            I$1.warn.apply(I$1, __spreadArrays([ "Firestore (8.0.2): " + t ], i));
        }
    }

    /**
     * Converts an additional log parameter to a string representation.
     */ function A$1(t) {
        if ("string" == typeof t) return t;
        try {
            return e = t, JSON.stringify(e);
        } catch (e) {
            // Converting to JSON failed, just log the object directly
            return t;
        }
        /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
        /** Formats an object as a JSON string, suitable for logging. */    var e;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Unconditionally fails, throwing an Error with the given message.
     * Messages are stripped in production builds.
     *
     * Returns `never` and can be used in expressions:
     * @example
     * let futureVar = fail('not implemented yet');
     */ function S$1(t) {
        void 0 === t && (t = "Unexpected state");
        // Log the failure in addition to throw an exception, just in case the
        // exception is swallowed.
            var e = "FIRESTORE (8.0.2) INTERNAL ASSERTION FAILED: " + t;
        // NOTE: We don't use FirestoreError here because these are internal failures
        // that cannot be handled by the user. (Also it would create a circular
        // dependency between the error and assert modules which doesn't work.)
            throw N$1(e), new Error(e)
        /**
     * Fails if the given assertion condition is false, throwing an Error with the
     * given message if it did.
     *
     * Messages are stripped in production builds.
     */;
    }

    function k$1(t, e) {
        t || S$1();
    }

    /**
     * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
     * instance of `T` before casting.
     */ function D$1(t, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e) {
        return t;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Generates `nBytes` of random bytes.
     *
     * If `nBytes < 0` , an error will be thrown.
     */ function O$1(t) {
        // Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
        var e = 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "undefined" != typeof self && (self.crypto || self.msCrypto), n = new Uint8Array(t);
        if (e && "function" == typeof e.getRandomValues) e.getRandomValues(n); else 
        // Falls back to Math.random
        for (var r = 0; r < t; r++) n[r] = Math.floor(256 * Math.random());
        return n;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var P$1 = /** @class */ function() {
        function t() {}
        return t.u = function() {
            for (
            // Alphanumeric characters
            var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", e = Math.floor(256 / t.length) * t.length, n = ""
            // The largest byte value that is a multiple of `char.length`.
            ; n.length < 20; ) for (var r = O$1(40), i = 0; i < r.length; ++i) 
            // Only accept values that are [0, maxMultiple), this ensures they can
            // be evenly mapped to indices of `chars` via a modulo operation.
            n.length < 20 && r[i] < e && (n += t.charAt(r[i] % t.length));
            return n;
        }, t;
    }();

    function V$1(t, e) {
        return t < e ? -1 : t > e ? 1 : 0;
    }

    /** Helper to compare arrays using isEqual(). */ function C$1(t, e, n) {
        return t.length === e.length && t.every((function(t, r) {
            return n(t, e[r]);
        }));
    }

    /**
     * Returns the immediate lexicographically-following string. This is useful to
     * construct an inclusive range for indexeddb iterators.
     */ function L$1(t) {
        // Return the input string, with an additional NUL byte appended.
        return t + "\0";
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ function R$1(t) {
        var e = 0;
        for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && e++;
        return e;
    }

    function M$1(t, e) {
        for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && e(n, t[n]);
    }

    function U$1(t) {
        for (var e in t) if (Object.prototype.hasOwnProperty.call(t, e)) return !1;
        return !0;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A map implementation that uses objects as keys. Objects must have an
     * associated equals function and must be immutable. Entries in the map are
     * stored together with the key being produced from the mapKeyFn. This map
     * automatically handles collisions of keys.
     */ var q$1 = /** @class */ function() {
        function t(t, e) {
            this.h = t, this.l = e, 
            /**
                 * The inner map for a key -> value pair. Due to the possibility of
                 * collisions we keep a list of entries that we do a linear search through
                 * to find an actual match. Note that collisions should be rare, so we still
                 * expect near constant time lookups in practice.
                 */
            this._ = {}
            /** Get a value for this key, or undefined if it does not exist. */;
        }
        return t.prototype.get = function(t) {
            var e = this.h(t), n = this._[e];
            if (void 0 !== n) for (var r = 0, i = n; r < i.length; r++) {
                var o = i[r], u = o[0], s = o[1];
                if (this.l(u, t)) return s;
            }
        }, t.prototype.has = function(t) {
            return void 0 !== this.get(t);
        }, 
        /** Put this key and value in the map. */ t.prototype.set = function(t, e) {
            var n = this.h(t), r = this._[n];
            if (void 0 !== r) {
                for (var i = 0; i < r.length; i++) if (this.l(r[i][0], t)) return void (r[i] = [ t, e ]);
                r.push([ t, e ]);
            } else this._[n] = [ [ t, e ] ];
        }, 
        /**
         * Remove this key from the map. Returns a boolean if anything was deleted.
         */
        t.prototype.delete = function(t) {
            var e = this.h(t), n = this._[e];
            if (void 0 === n) return !1;
            for (var r = 0; r < n.length; r++) if (this.l(n[r][0], t)) return 1 === n.length ? delete this._[e] : n.splice(r, 1), 
            !0;
            return !1;
        }, t.prototype.forEach = function(t) {
            M$1(this._, (function(e, n) {
                for (var r = 0, i = n; r < i.length; r++) {
                    var o = i[r], u = o[0], s = o[1];
                    t(u, s);
                }
            }));
        }, t.prototype.T = function() {
            return U$1(this._);
        }, t;
    }(), F$1 = {
        // Causes are copied from:
        // https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
        /** Not an error; returned on success. */
        OK: "ok",
        /** The operation was cancelled (typically by the caller). */
        CANCELLED: "cancelled",
        /** Unknown error or an error from a different error domain. */
        UNKNOWN: "unknown",
        /**
         * Client specified an invalid argument. Note that this differs from
         * FAILED_PRECONDITION. INVALID_ARGUMENT indicates arguments that are
         * problematic regardless of the state of the system (e.g., a malformed file
         * name).
         */
        INVALID_ARGUMENT: "invalid-argument",
        /**
         * Deadline expired before operation could complete. For operations that
         * change the state of the system, this error may be returned even if the
         * operation has completed successfully. For example, a successful response
         * from a server could have been delayed long enough for the deadline to
         * expire.
         */
        DEADLINE_EXCEEDED: "deadline-exceeded",
        /** Some requested entity (e.g., file or directory) was not found. */
        NOT_FOUND: "not-found",
        /**
         * Some entity that we attempted to create (e.g., file or directory) already
         * exists.
         */
        ALREADY_EXISTS: "already-exists",
        /**
         * The caller does not have permission to execute the specified operation.
         * PERMISSION_DENIED must not be used for rejections caused by exhausting
         * some resource (use RESOURCE_EXHAUSTED instead for those errors).
         * PERMISSION_DENIED must not be used if the caller can not be identified
         * (use UNAUTHENTICATED instead for those errors).
         */
        PERMISSION_DENIED: "permission-denied",
        /**
         * The request does not have valid authentication credentials for the
         * operation.
         */
        UNAUTHENTICATED: "unauthenticated",
        /**
         * Some resource has been exhausted, perhaps a per-user quota, or perhaps the
         * entire file system is out of space.
         */
        RESOURCE_EXHAUSTED: "resource-exhausted",
        /**
         * Operation was rejected because the system is not in a state required for
         * the operation's execution. For example, directory to be deleted may be
         * non-empty, an rmdir operation is applied to a non-directory, etc.
         *
         * A litmus test that may help a service implementor in deciding
         * between FAILED_PRECONDITION, ABORTED, and UNAVAILABLE:
         *  (a) Use UNAVAILABLE if the client can retry just the failing call.
         *  (b) Use ABORTED if the client should retry at a higher-level
         *      (e.g., restarting a read-modify-write sequence).
         *  (c) Use FAILED_PRECONDITION if the client should not retry until
         *      the system state has been explicitly fixed. E.g., if an "rmdir"
         *      fails because the directory is non-empty, FAILED_PRECONDITION
         *      should be returned since the client should not retry unless
         *      they have first fixed up the directory by deleting files from it.
         *  (d) Use FAILED_PRECONDITION if the client performs conditional
         *      REST Get/Update/Delete on a resource and the resource on the
         *      server does not match the condition. E.g., conflicting
         *      read-modify-write on the same resource.
         */
        FAILED_PRECONDITION: "failed-precondition",
        /**
         * The operation was aborted, typically due to a concurrency issue like
         * sequencer check failures, transaction aborts, etc.
         *
         * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
         * and UNAVAILABLE.
         */
        ABORTED: "aborted",
        /**
         * Operation was attempted past the valid range. E.g., seeking or reading
         * past end of file.
         *
         * Unlike INVALID_ARGUMENT, this error indicates a problem that may be fixed
         * if the system state changes. For example, a 32-bit file system will
         * generate INVALID_ARGUMENT if asked to read at an offset that is not in the
         * range [0,2^32-1], but it will generate OUT_OF_RANGE if asked to read from
         * an offset past the current file size.
         *
         * There is a fair bit of overlap between FAILED_PRECONDITION and
         * OUT_OF_RANGE. We recommend using OUT_OF_RANGE (the more specific error)
         * when it applies so that callers who are iterating through a space can
         * easily look for an OUT_OF_RANGE error to detect when they are done.
         */
        OUT_OF_RANGE: "out-of-range",
        /** Operation is not implemented or not supported/enabled in this service. */
        UNIMPLEMENTED: "unimplemented",
        /**
         * Internal errors. Means some invariants expected by underlying System has
         * been broken. If you see one of these errors, Something is very broken.
         */
        INTERNAL: "internal",
        /**
         * The service is currently unavailable. This is a most likely a transient
         * condition and may be corrected by retrying with a backoff.
         *
         * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
         * and UNAVAILABLE.
         */
        UNAVAILABLE: "unavailable",
        /** Unrecoverable data loss or corruption. */
        DATA_LOSS: "data-loss"
    }, j = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, n) || this).code = t, r.message = n, r.name = "FirebaseError", 
            // HACK: We write a toString property directly because Error is not a real
            // class and so inheritance does not work correctly. We could alternatively
            // do the same "back-door inheritance" trick that FirebaseError does.
            r.toString = function() {
                return r.name + ": [code=" + r.code + "]: " + r.message;
            }, r;
        }
        return __extends(n, e), n;
    }(Error), B = /** @class */ function() {
        /**
         * Creates a new timestamp.
         *
         * @param seconds The number of seconds of UTC time since Unix epoch
         *     1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
         *     9999-12-31T23:59:59Z inclusive.
         * @param nanoseconds The non-negative fractions of a second at nanosecond
         *     resolution. Negative second values with fractions must still have
         *     non-negative nanoseconds values that count forward in time. Must be
         *     from 0 to 999,999,999 inclusive.
         */
        function t(t, e) {
            if (this.seconds = t, this.nanoseconds = e, e < 0) throw new j(F$1.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
            if (e >= 1e9) throw new j(F$1.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
            if (t < -62135596800) throw new j(F$1.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
            // This will break in the year 10,000.
                    if (t >= 253402300800) throw new j(F$1.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
        }
        /**
         * Creates a new timestamp with the current date, with millisecond precision.
         *
         * @return a new timestamp representing the current date.
         */    return t.now = function() {
            return t.fromMillis(Date.now());
        }, 
        /**
         * Creates a new timestamp from the given date.
         *
         * @param date The date to initialize the `Timestamp` from.
         * @return A new `Timestamp` representing the same point in time as the given
         *     date.
         */
        t.fromDate = function(e) {
            return t.fromMillis(e.getTime());
        }, 
        /**
         * Creates a new timestamp from the given number of milliseconds.
         *
         * @param milliseconds Number of milliseconds since Unix epoch
         *     1970-01-01T00:00:00Z.
         * @return A new `Timestamp` representing the same point in time as the given
         *     number of milliseconds.
         */
        t.fromMillis = function(e) {
            var n = Math.floor(e / 1e3);
            return new t(n, 1e6 * (e - 1e3 * n));
        }, 
        /**
         * Converts a `Timestamp` to a JavaScript `Date` object. This conversion causes
         * a loss of precision since `Date` objects only support millisecond precision.
         *
         * @return JavaScript `Date` object representing the same point in time as
         *     this `Timestamp`, with millisecond precision.
         */
        t.prototype.toDate = function() {
            return new Date(this.toMillis());
        }, 
        /**
         * Converts a `Timestamp` to a numeric timestamp (in milliseconds since
         * epoch). This operation causes a loss of precision.
         *
         * @return The point in time corresponding to this timestamp, represented as
         *     the number of milliseconds since Unix epoch 1970-01-01T00:00:00Z.
         */
        t.prototype.toMillis = function() {
            return 1e3 * this.seconds + this.nanoseconds / 1e6;
        }, t.prototype.I = function(t) {
            return this.seconds === t.seconds ? V$1(this.nanoseconds, t.nanoseconds) : V$1(this.seconds, t.seconds);
        }, 
        /**
         * Returns true if this `Timestamp` is equal to the provided one.
         *
         * @param other The `Timestamp` to compare against.
         * @return true if this `Timestamp` is equal to the provided one.
         */
        t.prototype.isEqual = function(t) {
            return t.seconds === this.seconds && t.nanoseconds === this.nanoseconds;
        }, t.prototype.toString = function() {
            return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
        }, t.prototype.toJSON = function() {
            return {
                seconds: this.seconds,
                nanoseconds: this.nanoseconds
            };
        }, 
        /**
         * Converts this object to a primitive string, which allows Timestamp objects to be compared
         * using the `>`, `<=`, `>=` and `>` operators.
         */
        t.prototype.valueOf = function() {
            // This method returns a string of the form <seconds>.<nanoseconds> where <seconds> is
            // translated to have a non-negative value and both <seconds> and <nanoseconds> are left-padded
            // with zeroes to be a consistent length. Strings with this format then have a lexiographical
            // ordering that matches the expected ordering. The <seconds> translation is done to avoid
            // having a leading negative sign (i.e. a leading '-' character) in its string representation,
            // which would affect its lexiographical ordering.
            var t = this.seconds - -62135596800;
            // Note: Up to 12 decimal digits are required to represent all valid 'seconds' values.
                    return String(t).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
        }, t;
    }(), z = /** @class */ function() {
        function t(t) {
            this.timestamp = t;
        }
        return t.m = function(e) {
            return new t(e);
        }, t.min = function() {
            return new t(new B(0, 0));
        }, t.prototype.A = function(t) {
            return this.timestamp.I(t.timestamp);
        }, t.prototype.isEqual = function(t) {
            return this.timestamp.isEqual(t.timestamp);
        }, 
        /** Returns a number representation of the version for use in spec tests. */ t.prototype.R = function() {
            // Convert to microseconds.
            return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
        }, t.prototype.toString = function() {
            return "SnapshotVersion(" + this.timestamp.toString() + ")";
        }, t.prototype.P = function() {
            return this.timestamp;
        }, t;
    }(), G$1 = /** @class */ function() {
        function t(t, e, n) {
            void 0 === e ? e = 0 : e > t.length && S$1(), void 0 === n ? n = t.length - e : n > t.length - e && S$1(), 
            this.segments = t, this.offset = e, this.g = n;
        }
        return Object.defineProperty(t.prototype, "length", {
            get: function() {
                return this.g;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(e) {
            return 0 === t.V(this, e);
        }, t.prototype.child = function(e) {
            var n = this.segments.slice(this.offset, this.limit());
            return e instanceof t ? e.forEach((function(t) {
                n.push(t);
            })) : n.push(e), this.p(n);
        }, 
        /** The index of one past the last segment of the path. */ t.prototype.limit = function() {
            return this.offset + this.length;
        }, t.prototype.v = function(t) {
            return t = void 0 === t ? 1 : t, this.p(this.segments, this.offset + t, this.length - t);
        }, t.prototype.S = function() {
            return this.p(this.segments, this.offset, this.length - 1);
        }, t.prototype.D = function() {
            return this.segments[this.offset];
        }, t.prototype.C = function() {
            return this.get(this.length - 1);
        }, t.prototype.get = function(t) {
            return this.segments[this.offset + t];
        }, t.prototype.T = function() {
            return 0 === this.length;
        }, t.prototype.N = function(t) {
            if (t.length < this.length) return !1;
            for (var e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
            return !0;
        }, t.prototype.F = function(t) {
            if (this.length + 1 !== t.length) return !1;
            for (var e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
            return !0;
        }, t.prototype.forEach = function(t) {
            for (var e = this.offset, n = this.limit(); e < n; e++) t(this.segments[e]);
        }, t.prototype.O = function() {
            return this.segments.slice(this.offset, this.limit());
        }, t.V = function(t, e) {
            for (var n = Math.min(t.length, e.length), r = 0; r < n; r++) {
                var i = t.get(r), o = e.get(r);
                if (i < o) return -1;
                if (i > o) return 1;
            }
            return t.length < e.length ? -1 : t.length > e.length ? 1 : 0;
        }, t;
    }(), K$1 = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return __extends(n, e), n.prototype.p = function(t, e, r) {
            return new n(t, e, r);
        }, n.prototype.M = function() {
            // NOTE: The client is ignorant of any path segments containing escape
            // sequences (e.g. __id123__) and just passes them through raw (they exist
            // for legacy reasons and should not be used frequently).
            return this.O().join("/");
        }, n.prototype.toString = function() {
            return this.M();
        }, 
        /**
         * Creates a resource path from the given slash-delimited string. If multiple
         * arguments are provided, all components are combined. Leading and trailing
         * slashes from all components are ignored.
         */
        n.k = function() {
            for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
            // NOTE: The client is ignorant of any path segments containing escape
            // sequences (e.g. __id123__) and just passes them through raw (they exist
            // for legacy reasons and should not be used frequently).
                    for (var r = [], i = 0, o = t; i < o.length; i++) {
                var u = o[i];
                if (u.indexOf("//") >= 0) throw new j(F$1.INVALID_ARGUMENT, "Invalid segment (" + u + "). Paths must not contain // in them.");
                // Strip leading and traling slashed.
                            r.push.apply(r, u.split("/").filter((function(t) {
                    return t.length > 0;
                })));
            }
            return new n(r);
        }, n.$ = function() {
            return new n([]);
        }, n;
    }(G$1), Q$1 = /^[_a-zA-Z][_a-zA-Z0-9]*$/, W$1 = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return __extends(n, e), n.prototype.p = function(t, e, r) {
            return new n(t, e, r);
        }, 
        /**
         * Returns true if the string could be used as a segment in a field path
         * without escaping.
         */
        n.L = function(t) {
            return Q$1.test(t);
        }, n.prototype.M = function() {
            return this.O().map((function(t) {
                return t = t.replace("\\", "\\\\").replace("`", "\\`"), n.L(t) || (t = "`" + t + "`"), 
                t;
            })).join(".");
        }, n.prototype.toString = function() {
            return this.M();
        }, 
        /**
         * Returns true if this field references the key of a document.
         */
        n.prototype.B = function() {
            return 1 === this.length && "__name__" === this.get(0);
        }, 
        /**
         * The field designating the key of a document.
         */
        n.q = function() {
            return new n([ "__name__" ]);
        }, 
        /**
         * Parses a field string from the given server-formatted string.
         *
         * - Splitting the empty string is not allowed (for now at least).
         * - Empty segments within the string (e.g. if there are two consecutive
         *   separators) are not allowed.
         *
         * TODO(b/37244157): we should make this more strict. Right now, it allows
         * non-identifier path components, even if they aren't escaped.
         */
        n.U = function(t) {
            for (var e = [], r = "", i = 0, o = function() {
                if (0 === r.length) throw new j(F$1.INVALID_ARGUMENT, "Invalid field path (" + t + "). Paths must not be empty, begin with '.', end with '.', or contain '..'");
                e.push(r), r = "";
            }, u = !1; i < t.length; ) {
                var s = t[i];
                if ("\\" === s) {
                    if (i + 1 === t.length) throw new j(F$1.INVALID_ARGUMENT, "Path has trailing escape character: " + t);
                    var a = t[i + 1];
                    if ("\\" !== a && "." !== a && "`" !== a) throw new j(F$1.INVALID_ARGUMENT, "Path has invalid escape sequence: " + t);
                    r += a, i += 2;
                } else "`" === s ? (u = !u, i++) : "." !== s || u ? (r += s, i++) : (o(), i++);
            }
            if (o(), u) throw new j(F$1.INVALID_ARGUMENT, "Unterminated ` in path: " + t);
            return new n(e);
        }, n.$ = function() {
            return new n([]);
        }, n;
    }(G$1), Y$1 = /** @class */ function() {
        function t(t) {
            this.path = t;
        }
        return t.K = function(e) {
            return new t(K$1.k(e));
        }, t.W = function(e) {
            return new t(K$1.k(e).v(5));
        }, 
        /** Returns true if the document is in the specified collectionId. */ t.prototype.j = function(t) {
            return this.path.length >= 2 && this.path.get(this.path.length - 2) === t;
        }, t.prototype.isEqual = function(t) {
            return null !== t && 0 === K$1.V(this.path, t.path);
        }, t.prototype.toString = function() {
            return this.path.toString();
        }, t.V = function(t, e) {
            return K$1.V(t.path, e.path);
        }, t.G = function(t) {
            return t.length % 2 == 0;
        }, 
        /**
         * Creates and returns a new document key with the given segments.
         *
         * @param segments The segments of the path to the document
         * @return A new instance of DocumentKey
         */
        t.H = function(e) {
            return new t(new K$1(e.slice()));
        }, t;
    }();

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns whether a variable is either undefined or null.
     */
    function H$1(t) {
        return null == t;
    }

    /** Returns whether the value represents -0. */ function J$1(t) {
        // Detect if the value is -0.0. Based on polyfill from
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
        return 0 === t && 1 / t == -1 / 0;
    }

    /**
     * Returns whether a value is an integer and in the safe integer range
     * @param value The value to test for being an integer and in the safe range
     */ function X$1(t) {
        return "number" == typeof t && Number.isInteger(t) && !J$1(t) && t <= Number.MAX_SAFE_INTEGER && t >= Number.MIN_SAFE_INTEGER;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Visible for testing
    var $ = function(t, e, n, r, i, o, u) {
        void 0 === e && (e = null), void 0 === n && (n = []), void 0 === r && (r = []), 
        void 0 === i && (i = null), void 0 === o && (o = null), void 0 === u && (u = null), 
        this.path = t, this.collectionGroup = e, this.orderBy = n, this.filters = r, this.limit = i, 
        this.startAt = o, this.endAt = u, this.J = null;
    };

    /**
     * Initializes a Target with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     *
     * NOTE: you should always construct `Target` from `Query.toTarget` instead of
     * using this factory method, because `Query` provides an implicit `orderBy`
     * property.
     */ function Z$1(t, e, n, r, i, o, u) {
        return void 0 === e && (e = null), void 0 === n && (n = []), void 0 === r && (r = []), 
        void 0 === i && (i = null), void 0 === o && (o = null), void 0 === u && (u = null), 
        new $(t, e, n, r, i, o, u);
    }

    function tt(t) {
        var e = D$1(t);
        if (null === e.J) {
            var n = e.path.M();
            null !== e.collectionGroup && (n += "|cg:" + e.collectionGroup), n += "|f:", n += e.filters.map((function(t) {
                return function(t) {
                    // TODO(b/29183165): Technically, this won't be unique if two values have
                    // the same description, such as the int 3 and the string "3". So we should
                    // add the types in here somehow, too.
                    return t.field.M() + t.op.toString() + Qt(t.value);
                }(t);
            })).join(","), n += "|ob:", n += e.orderBy.map((function(t) {
                return (e = t).field.M() + e.dir;
                var e;
            })).join(","), H$1(e.limit) || (n += "|l:", n += e.limit), e.startAt && (n += "|lb:", 
            n += Xn(e.startAt)), e.endAt && (n += "|ub:", n += Xn(e.endAt)), e.J = n;
        }
        return e.J;
    }

    function et(t, e) {
        if (t.limit !== e.limit) return !1;
        if (t.orderBy.length !== e.orderBy.length) return !1;
        for (var n = 0; n < t.orderBy.length; n++) if (!nr(t.orderBy[n], e.orderBy[n])) return !1;
        if (t.filters.length !== e.filters.length) return !1;
        for (var r = 0; r < t.filters.length; r++) if (i = t.filters[r], o = e.filters[r], 
        i.op !== o.op || !i.field.isEqual(o.field) || !Bt(i.value, o.value)) return !1;
        var i, o;
        return t.collectionGroup === e.collectionGroup && !!t.path.isEqual(e.path) && !!Zn(t.startAt, e.startAt) && Zn(t.endAt, e.endAt);
    }

    function nt(t) {
        return Y$1.G(t.path) && null === t.collectionGroup && 0 === t.filters.length;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Converts a Base64 encoded string to a binary string. */
    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Immutable class that represents a "proto" byte string.
     *
     * Proto byte strings can either be Base64-encoded strings or Uint8Arrays when
     * sent on the wire. This class abstracts away this differentiation by holding
     * the proto byte string in a common class that must be converted into a string
     * before being sent as a proto.
     */ var rt = /** @class */ function() {
        function t(t) {
            this.Y = t;
        }
        return t.fromBase64String = function(e) {
            return new t(atob(e));
        }, t.fromUint8Array = function(e) {
            return new t(
            /**
     * Helper function to convert an Uint8array to a binary string.
     */
            function(t) {
                for (var e = "", n = 0; n < t.length; ++n) e += String.fromCharCode(t[n]);
                return e;
            }(e));
        }, t.prototype.toBase64 = function() {
            return t = this.Y, btoa(t);
            /** Converts a binary string to a Base64 encoded string. */        var t;
            /** True if and only if the Base64 conversion functions are available. */    }, 
        t.prototype.toUint8Array = function() {
            return function(t) {
                for (var e = new Uint8Array(t.length), n = 0; n < t.length; n++) e[n] = t.charCodeAt(n);
                return e;
            }(this.Y);
        }, t.prototype.X = function() {
            return 2 * this.Y.length;
        }, t.prototype.A = function(t) {
            return V$1(this.Y, t.Y);
        }, t.prototype.isEqual = function(t) {
            return this.Y === t.Y;
        }, t;
    }();

    rt.Z = new rt("");

    var it, ot, ut = /** @class */ function() {
        function t(
        /** The target being listened to. */
        t, 
        /**
         * The target ID to which the target corresponds; Assigned by the
         * LocalStore for user listens and by the SyncEngine for limbo watches.
         */
        e, 
        /** The purpose of the target. */
        n, 
        /**
         * The sequence number of the last transaction during which this target data
         * was modified.
         */
        r, 
        /** The latest snapshot version seen for this target. */
        i
        /**
         * The maximum snapshot version at which the associated view
         * contained no limbo documents.
         */ , o
        /**
         * An opaque, server-assigned token that allows watching a target to be
         * resumed after disconnecting without retransmitting all the data that
         * matches the target. The resume token essentially identifies a point in
         * time from which the server should resume sending results.
         */ , u) {
            void 0 === i && (i = z.min()), void 0 === o && (o = z.min()), void 0 === u && (u = rt.Z), 
            this.target = t, this.targetId = e, this.tt = n, this.sequenceNumber = r, this.et = i, 
            this.lastLimboFreeSnapshotVersion = o, this.resumeToken = u;
        }
        /** Creates a new target data instance with an updated sequence number. */    return t.prototype.nt = function(e) {
            return new t(this.target, this.targetId, this.tt, e, this.et, this.lastLimboFreeSnapshotVersion, this.resumeToken);
        }, 
        /**
         * Creates a new target data instance with an updated resume token and
         * snapshot version.
         */
        t.prototype.st = function(e, n) {
            return new t(this.target, this.targetId, this.tt, this.sequenceNumber, n, this.lastLimboFreeSnapshotVersion, e);
        }, 
        /**
         * Creates a new target data instance with an updated last limbo free
         * snapshot version number.
         */
        t.prototype.it = function(e) {
            return new t(this.target, this.targetId, this.tt, this.sequenceNumber, this.et, e, this.resumeToken);
        }, t;
    }(), st = 
    // TODO(b/33078163): just use simplest form of existence filter for now
    function(t) {
        this.count = t;
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Determines whether an error code represents a permanent error when received
     * in response to a non-write operation.
     *
     * See isPermanentWriteError for classifying write errors.
     */
    function at(t) {
        switch (t) {
          case F$1.OK:
            return S$1();

          case F$1.CANCELLED:
          case F$1.UNKNOWN:
          case F$1.DEADLINE_EXCEEDED:
          case F$1.RESOURCE_EXHAUSTED:
          case F$1.INTERNAL:
          case F$1.UNAVAILABLE:
     // Unauthenticated means something went wrong with our token and we need
            // to retry with new credentials which will happen automatically.
                  case F$1.UNAUTHENTICATED:
            return !1;

          case F$1.INVALID_ARGUMENT:
          case F$1.NOT_FOUND:
          case F$1.ALREADY_EXISTS:
          case F$1.PERMISSION_DENIED:
          case F$1.FAILED_PRECONDITION:
     // Aborted might be retried in some scenarios, but that is dependant on
            // the context and should handled individually by the calling code.
            // See https://cloud.google.com/apis/design/errors.
                  case F$1.ABORTED:
          case F$1.OUT_OF_RANGE:
          case F$1.UNIMPLEMENTED:
          case F$1.DATA_LOSS:
            return !0;

          default:
            return S$1();
        }
    }

    /**
     * Determines whether an error code represents a permanent error when received
     * in response to a write operation.
     *
     * Write operations must be handled specially because as of b/119437764, ABORTED
     * errors on the write stream should be retried too (even though ABORTED errors
     * are not generally retryable).
     *
     * Note that during the initial handshake on the write stream an ABORTED error
     * signals that we should discard our stream token (i.e. it is permanent). This
     * means a handshake error should be classified with isPermanentError, above.
     */
    /**
     * Maps an error Code from GRPC status code number, like 0, 1, or 14. These
     * are not the same as HTTP status codes.
     *
     * @returns The Code equivalent to the given GRPC status code. Fails if there
     *     is no match.
     */ function ct(t) {
        if (void 0 === t) 
        // This shouldn't normally happen, but in certain error cases (like trying
        // to send invalid proto messages) we may get an error with no GRPC code.
        return N$1("GRPC error has no .code"), F$1.UNKNOWN;
        switch (t) {
          case it.OK:
            return F$1.OK;

          case it.CANCELLED:
            return F$1.CANCELLED;

          case it.UNKNOWN:
            return F$1.UNKNOWN;

          case it.DEADLINE_EXCEEDED:
            return F$1.DEADLINE_EXCEEDED;

          case it.RESOURCE_EXHAUSTED:
            return F$1.RESOURCE_EXHAUSTED;

          case it.INTERNAL:
            return F$1.INTERNAL;

          case it.UNAVAILABLE:
            return F$1.UNAVAILABLE;

          case it.UNAUTHENTICATED:
            return F$1.UNAUTHENTICATED;

          case it.INVALID_ARGUMENT:
            return F$1.INVALID_ARGUMENT;

          case it.NOT_FOUND:
            return F$1.NOT_FOUND;

          case it.ALREADY_EXISTS:
            return F$1.ALREADY_EXISTS;

          case it.PERMISSION_DENIED:
            return F$1.PERMISSION_DENIED;

          case it.FAILED_PRECONDITION:
            return F$1.FAILED_PRECONDITION;

          case it.ABORTED:
            return F$1.ABORTED;

          case it.OUT_OF_RANGE:
            return F$1.OUT_OF_RANGE;

          case it.UNIMPLEMENTED:
            return F$1.UNIMPLEMENTED;

          case it.DATA_LOSS:
            return F$1.DATA_LOSS;

          default:
            return S$1();
        }
    }

    /**
     * Converts an HTTP response's error status to the equivalent error code.
     *
     * @param status An HTTP error response status ("FAILED_PRECONDITION",
     * "UNKNOWN", etc.)
     * @returns The equivalent Code. Non-matching responses are mapped to
     *     Code.UNKNOWN.
     */ (ot = it || (it = {}))[ot.OK = 0] = "OK", ot[ot.CANCELLED = 1] = "CANCELLED", 
    ot[ot.UNKNOWN = 2] = "UNKNOWN", ot[ot.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", 
    ot[ot.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", ot[ot.NOT_FOUND = 5] = "NOT_FOUND", 
    ot[ot.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", ot[ot.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", 
    ot[ot.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", ot[ot.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", 
    ot[ot.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", ot[ot.ABORTED = 10] = "ABORTED", 
    ot[ot.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", ot[ot.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", 
    ot[ot.INTERNAL = 13] = "INTERNAL", ot[ot.UNAVAILABLE = 14] = "UNAVAILABLE", ot[ot.DATA_LOSS = 15] = "DATA_LOSS";

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // An immutable sorted map implementation, based on a Left-leaning Red-Black
    // tree.
    var ht = /** @class */ function() {
        function t(t, e) {
            this.V = t, this.root = e || lt.EMPTY;
        }
        // Returns a copy of the map, with the specified key/value added or replaced.
            return t.prototype.rt = function(e, n) {
            return new t(this.V, this.root.rt(e, n, this.V).copy(null, null, lt.ot, null, null));
        }, 
        // Returns a copy of the map, with the specified key removed.
        t.prototype.remove = function(e) {
            return new t(this.V, this.root.remove(e, this.V).copy(null, null, lt.ot, null, null));
        }, 
        // Returns the value of the node with the given key, or null.
        t.prototype.get = function(t) {
            for (var e = this.root; !e.T(); ) {
                var n = this.V(t, e.key);
                if (0 === n) return e.value;
                n < 0 ? e = e.left : n > 0 && (e = e.right);
            }
            return null;
        }, 
        // Returns the index of the element in this sorted map, or -1 if it doesn't
        // exist.
        t.prototype.indexOf = function(t) {
            for (
            // Number of nodes that were pruned when descending right
            var e = 0, n = this.root; !n.T(); ) {
                var r = this.V(t, n.key);
                if (0 === r) return e + n.left.size;
                r < 0 ? n = n.left : (
                // Count all nodes left of the node plus the node itself
                e += n.left.size + 1, n = n.right);
            }
            // Node not found
                    return -1;
        }, t.prototype.T = function() {
            return this.root.T();
        }, Object.defineProperty(t.prototype, "size", {
            // Returns the total number of nodes in the map.
            get: function() {
                return this.root.size;
            },
            enumerable: !1,
            configurable: !0
        }), 
        // Returns the minimum key in the map.
        t.prototype.at = function() {
            return this.root.at();
        }, 
        // Returns the maximum key in the map.
        t.prototype.ct = function() {
            return this.root.ct();
        }, 
        // Traverses the map in key order and calls the specified action function
        // for each key/value pair. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        t.prototype.ut = function(t) {
            return this.root.ut(t);
        }, t.prototype.forEach = function(t) {
            this.ut((function(e, n) {
                return t(e, n), !1;
            }));
        }, t.prototype.toString = function() {
            var t = [];
            return this.ut((function(e, n) {
                return t.push(e + ":" + n), !1;
            })), "{" + t.join(", ") + "}";
        }, 
        // Traverses the map in reverse key order and calls the specified action
        // function for each key/value pair. If action returns true, traversal is
        // aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        t.prototype.ht = function(t) {
            return this.root.ht(t);
        }, 
        // Returns an iterator over the SortedMap.
        t.prototype.lt = function() {
            return new ft(this.root, null, this.V, !1);
        }, t.prototype._t = function(t) {
            return new ft(this.root, t, this.V, !1);
        }, t.prototype.ft = function() {
            return new ft(this.root, null, this.V, !0);
        }, t.prototype.dt = function(t) {
            return new ft(this.root, t, this.V, !0);
        }, t;
    }(), ft = /** @class */ function() {
        function t(t, e, n, r) {
            this.wt = r, this.Tt = [];
            for (var i = 1; !t.T(); ) if (i = e ? n(t.key, e) : 1, 
            // flip the comparison if we're going in reverse
            r && (i *= -1), i < 0) 
            // This node is less than our start key. ignore it
            t = this.wt ? t.left : t.right; else {
                if (0 === i) {
                    // This node is exactly equal to our start key. Push it on the stack,
                    // but stop iterating;
                    this.Tt.push(t);
                    break;
                }
                // This node is greater than our start key, add it to the stack and move
                // to the next one
                            this.Tt.push(t), t = this.wt ? t.right : t.left;
            }
        }
        return t.prototype.Et = function() {
            var t = this.Tt.pop(), e = {
                key: t.key,
                value: t.value
            };
            if (this.wt) for (t = t.left; !t.T(); ) this.Tt.push(t), t = t.right; else for (t = t.right; !t.T(); ) this.Tt.push(t), 
            t = t.left;
            return e;
        }, t.prototype.It = function() {
            return this.Tt.length > 0;
        }, t.prototype.At = function() {
            if (0 === this.Tt.length) return null;
            var t = this.Tt[this.Tt.length - 1];
            return {
                key: t.key,
                value: t.value
            };
        }, t;
    }(), lt = /** @class */ function() {
        function t(e, n, r, i, o) {
            this.key = e, this.value = n, this.color = null != r ? r : t.RED, this.left = null != i ? i : t.EMPTY, 
            this.right = null != o ? o : t.EMPTY, this.size = this.left.size + 1 + this.right.size;
        }
        // Returns a copy of the current node, optionally replacing pieces of it.
            return t.prototype.copy = function(e, n, r, i, o) {
            return new t(null != e ? e : this.key, null != n ? n : this.value, null != r ? r : this.color, null != i ? i : this.left, null != o ? o : this.right);
        }, t.prototype.T = function() {
            return !1;
        }, 
        // Traverses the tree in key order and calls the specified action function
        // for each node. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        t.prototype.ut = function(t) {
            return this.left.ut(t) || t(this.key, this.value) || this.right.ut(t);
        }, 
        // Traverses the tree in reverse key order and calls the specified action
        // function for each node. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        t.prototype.ht = function(t) {
            return this.right.ht(t) || t(this.key, this.value) || this.left.ht(t);
        }, 
        // Returns the minimum node in the tree.
        t.prototype.min = function() {
            return this.left.T() ? this : this.left.min();
        }, 
        // Returns the maximum key in the tree.
        t.prototype.at = function() {
            return this.min().key;
        }, 
        // Returns the maximum key in the tree.
        t.prototype.ct = function() {
            return this.right.T() ? this.key : this.right.ct();
        }, 
        // Returns new tree, with the key/value added.
        t.prototype.rt = function(t, e, n) {
            var r = this, i = n(t, r.key);
            return (r = i < 0 ? r.copy(null, null, null, r.left.rt(t, e, n), null) : 0 === i ? r.copy(null, e, null, null, null) : r.copy(null, null, null, null, r.right.rt(t, e, n))).Rt();
        }, t.prototype.Pt = function() {
            if (this.left.T()) return t.EMPTY;
            var e = this;
            return e.left.gt() || e.left.left.gt() || (e = e.Vt()), (e = e.copy(null, null, null, e.left.Pt(), null)).Rt();
        }, 
        // Returns new tree, with the specified item removed.
        t.prototype.remove = function(e, n) {
            var r, i = this;
            if (n(e, i.key) < 0) i.left.T() || i.left.gt() || i.left.left.gt() || (i = i.Vt()), 
            i = i.copy(null, null, null, i.left.remove(e, n), null); else {
                if (i.left.gt() && (i = i.yt()), i.right.T() || i.right.gt() || i.right.left.gt() || (i = i.vt()), 
                0 === n(e, i.key)) {
                    if (i.right.T()) return t.EMPTY;
                    r = i.right.min(), i = i.copy(r.key, r.value, null, null, i.right.Pt());
                }
                i = i.copy(null, null, null, null, i.right.remove(e, n));
            }
            return i.Rt();
        }, t.prototype.gt = function() {
            return this.color;
        }, 
        // Returns new tree after performing any needed rotations.
        t.prototype.Rt = function() {
            var t = this;
            return t.right.gt() && !t.left.gt() && (t = t.bt()), t.left.gt() && t.left.left.gt() && (t = t.yt()), 
            t.left.gt() && t.right.gt() && (t = t.St()), t;
        }, t.prototype.Vt = function() {
            var t = this.St();
            return t.right.left.gt() && (t = (t = (t = t.copy(null, null, null, null, t.right.yt())).bt()).St()), 
            t;
        }, t.prototype.vt = function() {
            var t = this.St();
            return t.left.left.gt() && (t = (t = t.yt()).St()), t;
        }, t.prototype.bt = function() {
            var e = this.copy(null, null, t.RED, null, this.right.left);
            return this.right.copy(null, null, this.color, e, null);
        }, t.prototype.yt = function() {
            var e = this.copy(null, null, t.RED, this.left.right, null);
            return this.left.copy(null, null, this.color, null, e);
        }, t.prototype.St = function() {
            var t = this.left.copy(null, null, !this.left.color, null, null), e = this.right.copy(null, null, !this.right.color, null, null);
            return this.copy(null, null, !this.color, t, e);
        }, 
        // For testing.
        t.prototype.Dt = function() {
            var t = this.Ct();
            return Math.pow(2, t) <= this.size + 1;
        }, 
        // In a balanced RB tree, the black-depth (number of black nodes) from root to
        // leaves is equal on both sides.  This function verifies that or asserts.
        t.prototype.Ct = function() {
            if (this.gt() && this.left.gt()) throw S$1();
            if (this.right.gt()) throw S$1();
            var t = this.left.Ct();
            if (t !== this.right.Ct()) throw S$1();
            return t + (this.gt() ? 0 : 1);
        }, t;
    }();

    // end SortedMap
    // An iterator over an LLRBNode.
    // end LLRBNode
    // Empty node is shared between all LLRB trees.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lt.EMPTY = null, lt.RED = !0, lt.ot = !1, 
    // end LLRBEmptyNode
    lt.EMPTY = new (/** @class */ function() {
        function t() {
            this.size = 0;
        }
        return Object.defineProperty(t.prototype, "key", {
            get: function() {
                throw S$1();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "value", {
            get: function() {
                throw S$1();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "color", {
            get: function() {
                throw S$1();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "left", {
            get: function() {
                throw S$1();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "right", {
            get: function() {
                throw S$1();
            },
            enumerable: !1,
            configurable: !0
        }), 
        // Returns a copy of the current node.
        t.prototype.copy = function(t, e, n, r, i) {
            return this;
        }, 
        // Returns a copy of the tree, with the specified key/value added.
        t.prototype.rt = function(t, e, n) {
            return new lt(t, e);
        }, 
        // Returns a copy of the tree, with the specified key removed.
        t.prototype.remove = function(t, e) {
            return this;
        }, t.prototype.T = function() {
            return !0;
        }, t.prototype.ut = function(t) {
            return !1;
        }, t.prototype.ht = function(t) {
            return !1;
        }, t.prototype.at = function() {
            return null;
        }, t.prototype.ct = function() {
            return null;
        }, t.prototype.gt = function() {
            return !1;
        }, 
        // For testing.
        t.prototype.Dt = function() {
            return !0;
        }, t.prototype.Ct = function() {
            return 0;
        }, t;
    }());

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * SortedSet is an immutable (copy-on-write) collection that holds elements
     * in order specified by the provided comparator.
     *
     * NOTE: if provided comparator returns 0 for two elements, we consider them to
     * be equal!
     */
    var pt = /** @class */ function() {
        function t(t) {
            this.V = t, this.data = new ht(this.V);
        }
        return t.prototype.has = function(t) {
            return null !== this.data.get(t);
        }, t.prototype.first = function() {
            return this.data.at();
        }, t.prototype.last = function() {
            return this.data.ct();
        }, Object.defineProperty(t.prototype, "size", {
            get: function() {
                return this.data.size;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.indexOf = function(t) {
            return this.data.indexOf(t);
        }, 
        /** Iterates elements in order defined by "comparator" */ t.prototype.forEach = function(t) {
            this.data.ut((function(e, n) {
                return t(e), !1;
            }));
        }, 
        /** Iterates over `elem`s such that: range[0] <= elem < range[1]. */ t.prototype.Nt = function(t, e) {
            for (var n = this.data._t(t[0]); n.It(); ) {
                var r = n.Et();
                if (this.V(r.key, t[1]) >= 0) return;
                e(r.key);
            }
        }, 
        /**
         * Iterates over `elem`s such that: start <= elem until false is returned.
         */
        t.prototype.xt = function(t, e) {
            var n;
            for (n = void 0 !== e ? this.data._t(e) : this.data.lt(); n.It(); ) if (!t(n.Et().key)) return;
        }, 
        /** Finds the least element greater than or equal to `elem`. */ t.prototype.Ft = function(t) {
            var e = this.data._t(t);
            return e.It() ? e.Et().key : null;
        }, t.prototype.lt = function() {
            return new dt(this.data.lt());
        }, t.prototype._t = function(t) {
            return new dt(this.data._t(t));
        }, 
        /** Inserts or updates an element */ t.prototype.add = function(t) {
            return this.copy(this.data.remove(t).rt(t, !0));
        }, 
        /** Deletes an element */ t.prototype.delete = function(t) {
            return this.has(t) ? this.copy(this.data.remove(t)) : this;
        }, t.prototype.T = function() {
            return this.data.T();
        }, t.prototype.Ot = function(t) {
            var e = this;
            // Make sure `result` always refers to the larger one of the two sets.
                    return e.size < t.size && (e = t, t = this), t.forEach((function(t) {
                e = e.add(t);
            })), e;
        }, t.prototype.isEqual = function(e) {
            if (!(e instanceof t)) return !1;
            if (this.size !== e.size) return !1;
            for (var n = this.data.lt(), r = e.data.lt(); n.It(); ) {
                var i = n.Et().key, o = r.Et().key;
                if (0 !== this.V(i, o)) return !1;
            }
            return !0;
        }, t.prototype.O = function() {
            var t = [];
            return this.forEach((function(e) {
                t.push(e);
            })), t;
        }, t.prototype.toString = function() {
            var t = [];
            return this.forEach((function(e) {
                return t.push(e);
            })), "SortedSet(" + t.toString() + ")";
        }, t.prototype.copy = function(e) {
            var n = new t(this.V);
            return n.data = e, n;
        }, t;
    }(), dt = /** @class */ function() {
        function t(t) {
            this.Mt = t;
        }
        return t.prototype.Et = function() {
            return this.Mt.Et().key;
        }, t.prototype.It = function() {
            return this.Mt.It();
        }, t;
    }(), vt = new ht(Y$1.V);

    function yt() {
        return vt;
    }

    function gt() {
        return yt();
    }

    var mt = new ht(Y$1.V);

    function wt() {
        return mt;
    }

    var bt = new ht(Y$1.V), _t = new pt(Y$1.V);

    function It() {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        for (var n = _t, r = 0, i = t; r < i.length; r++) {
            var o = i[r];
            n = n.add(o);
        }
        return n;
    }

    var Et = new pt(V$1);

    function Tt() {
        return Et;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * DocumentSet is an immutable (copy-on-write) collection that holds documents
     * in order specified by the provided comparator. We always add a document key
     * comparator on top of what is provided to guarantee document equality based on
     * the key.
     */ var Nt = /** @class */ function() {
        /** The default ordering is by key if the comparator is omitted */
        function t(t) {
            // We are adding document key comparator to the end as it's the only
            // guaranteed unique property of a document.
            this.V = t ? function(e, n) {
                return t(e, n) || Y$1.V(e.key, n.key);
            } : function(t, e) {
                return Y$1.V(t.key, e.key);
            }, this.kt = wt(), this.$t = new ht(this.V)
            /**
         * Returns an empty copy of the existing DocumentSet, using the same
         * comparator.
         */;
        }
        return t.Lt = function(e) {
            return new t(e.V);
        }, t.prototype.has = function(t) {
            return null != this.kt.get(t);
        }, t.prototype.get = function(t) {
            return this.kt.get(t);
        }, t.prototype.first = function() {
            return this.$t.at();
        }, t.prototype.last = function() {
            return this.$t.ct();
        }, t.prototype.T = function() {
            return this.$t.T();
        }, 
        /**
         * Returns the index of the provided key in the document set, or -1 if the
         * document key is not present in the set;
         */
        t.prototype.indexOf = function(t) {
            var e = this.kt.get(t);
            return e ? this.$t.indexOf(e) : -1;
        }, Object.defineProperty(t.prototype, "size", {
            get: function() {
                return this.$t.size;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /** Iterates documents in order defined by "comparator" */ t.prototype.forEach = function(t) {
            this.$t.ut((function(e, n) {
                return t(e), !1;
            }));
        }, 
        /** Inserts or updates a document with the same key */ t.prototype.add = function(t) {
            // First remove the element if we have it.
            var e = this.delete(t.key);
            return e.copy(e.kt.rt(t.key, t), e.$t.rt(t, null));
        }, 
        /** Deletes a document with a given key */ t.prototype.delete = function(t) {
            var e = this.get(t);
            return e ? this.copy(this.kt.remove(t), this.$t.remove(e)) : this;
        }, t.prototype.isEqual = function(e) {
            if (!(e instanceof t)) return !1;
            if (this.size !== e.size) return !1;
            for (var n = this.$t.lt(), r = e.$t.lt(); n.It(); ) {
                var i = n.Et().key, o = r.Et().key;
                if (!i.isEqual(o)) return !1;
            }
            return !0;
        }, t.prototype.toString = function() {
            var t = [];
            return this.forEach((function(e) {
                t.push(e.toString());
            })), 0 === t.length ? "DocumentSet ()" : "DocumentSet (\n  " + t.join("  \n") + "\n)";
        }, t.prototype.copy = function(e, n) {
            var r = new t;
            return r.V = this.V, r.kt = e, r.$t = n, r;
        }, t;
    }(), xt = /** @class */ function() {
        function t() {
            this.Bt = new ht(Y$1.V);
        }
        return t.prototype.track = function(t) {
            var e = t.doc.key, n = this.Bt.get(e);
            n ? 
            // Merge the new change with the existing change.
            0 /* Added */ !== t.type && 3 /* Metadata */ === n.type ? this.Bt = this.Bt.rt(e, t) : 3 /* Metadata */ === t.type && 1 /* Removed */ !== n.type ? this.Bt = this.Bt.rt(e, {
                type: n.type,
                doc: t.doc
            }) : 2 /* Modified */ === t.type && 2 /* Modified */ === n.type ? this.Bt = this.Bt.rt(e, {
                type: 2 /* Modified */ ,
                doc: t.doc
            }) : 2 /* Modified */ === t.type && 0 /* Added */ === n.type ? this.Bt = this.Bt.rt(e, {
                type: 0 /* Added */ ,
                doc: t.doc
            }) : 1 /* Removed */ === t.type && 0 /* Added */ === n.type ? this.Bt = this.Bt.remove(e) : 1 /* Removed */ === t.type && 2 /* Modified */ === n.type ? this.Bt = this.Bt.rt(e, {
                type: 1 /* Removed */ ,
                doc: n.doc
            }) : 0 /* Added */ === t.type && 1 /* Removed */ === n.type ? this.Bt = this.Bt.rt(e, {
                type: 2 /* Modified */ ,
                doc: t.doc
            }) : 
            // This includes these cases, which don't make sense:
            // Added->Added
            // Removed->Removed
            // Modified->Added
            // Removed->Modified
            // Metadata->Added
            // Removed->Metadata
            S$1() : this.Bt = this.Bt.rt(e, t);
        }, t.prototype.qt = function() {
            var t = [];
            return this.Bt.ut((function(e, n) {
                t.push(n);
            })), t;
        }, t;
    }(), At = /** @class */ function() {
        function t(t, e, n, r, i, o, u, s) {
            this.query = t, this.docs = e, this.Ut = n, this.docChanges = r, this.Qt = i, this.fromCache = o, 
            this.Kt = u, this.Wt = s
            /** Returns a view snapshot as if all documents in the snapshot were added. */;
        }
        return t.jt = function(e, n, r, i) {
            var o = [];
            return n.forEach((function(t) {
                o.push({
                    type: 0 /* Added */ ,
                    doc: t
                });
            })), new t(e, n, Nt.Lt(n), o, r, i, 
            /* syncStateChanged= */ !0, 
            /* excludesMetadataChanges= */ !1);
        }, Object.defineProperty(t.prototype, "hasPendingWrites", {
            get: function() {
                return !this.Qt.T();
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(t) {
            if (!(this.fromCache === t.fromCache && this.Kt === t.Kt && this.Qt.isEqual(t.Qt) && Rn(this.query, t.query) && this.docs.isEqual(t.docs) && this.Ut.isEqual(t.Ut))) return !1;
            var e = this.docChanges, n = t.docChanges;
            if (e.length !== n.length) return !1;
            for (var r = 0; r < e.length; r++) if (e[r].type !== n[r].type || !e[r].doc.isEqual(n[r].doc)) return !1;
            return !0;
        }, t;
    }(), St = /** @class */ function() {
        function t(
        /**
         * The snapshot version this event brings us up to, or MIN if not set.
         */
        t, 
        /**
         * A map from target to changes to the target. See TargetChange.
         */
        e, 
        /**
         * A set of targets that is known to be inconsistent. Listens for these
         * targets should be re-established without resume tokens.
         */
        n, 
        /**
         * A set of which documents have changed or been deleted, along with the
         * doc's new values (if not deleted).
         */
        r, 
        /**
         * A set of which document updates are due only to limbo resolution targets.
         */
        i) {
            this.et = t, this.Gt = e, this.zt = n, this.Ht = r, this.Jt = i;
        }
        /**
         * HACK: Views require RemoteEvents in order to determine whether the view is
         * CURRENT, but secondary tabs don't receive remote events. So this method is
         * used to create a synthesized RemoteEvent that can be used to apply a
         * CURRENT status change to a View, for queries executed in a different tab.
         */
        // PORTING NOTE: Multi-tab only
            return t.Yt = function(e, n) {
            var r = new Map;
            return r.set(e, kt.Xt(e, n)), new t(z.min(), r, Tt(), yt(), It());
        }, t;
    }(), kt = /** @class */ function() {
        function t(
        /**
         * An opaque, server-assigned token that allows watching a query to be resumed
         * after disconnecting without retransmitting all the data that matches the
         * query. The resume token essentially identifies a point in time from which
         * the server should resume sending results.
         */
        t, 
        /**
         * The "current" (synced) status of this target. Note that "current"
         * has special meaning in the RPC protocol that implies that a target is
         * both up-to-date and consistent with the rest of the watch stream.
         */
        e, 
        /**
         * The set of documents that were newly assigned to this target as part of
         * this remote event.
         */
        n, 
        /**
         * The set of documents that were already assigned to this target but received
         * an update during this remote event.
         */
        r, 
        /**
         * The set of documents that were removed from this target as part of this
         * remote event.
         */
        i) {
            this.resumeToken = t, this.Zt = e, this.te = n, this.ee = r, this.ne = i
            /**
         * This method is used to create a synthesized TargetChanges that can be used to
         * apply a CURRENT status change to a View (for queries executed in a different
         * tab) or for new queries (to raise snapshots with correct CURRENT status).
         */;
        }
        return t.Xt = function(e, n) {
            return new t(rt.Z, n, It(), It(), It());
        }, t;
    }(), Dt = function(
    /** The new document applies to all of these targets. */
    t, 
    /** The new document is removed from all of these targets. */
    e, 
    /** The key of the document for this change. */
    n, 
    /**
         * The new document or NoDocument if it was deleted. Is null if the
         * document went out of view without the server sending a new document.
         */
    r) {
        this.se = t, this.removedTargetIds = e, this.key = n, this.ie = r;
    }, Ot = function(t, e) {
        this.targetId = t, this.re = e;
    }, Pt = function(
    /** What kind of change occurred to the watch target. */
    t, 
    /** The target IDs that were added/removed/set. */
    e, 
    /**
         * An opaque, server-assigned token that allows watching a target to be
         * resumed after disconnecting without retransmitting all the data that
         * matches the target. The resume token essentially identifies a point in
         * time from which the server should resume sending results.
         */
    n
    /** An RPC error indicating why the watch failed. */ , r) {
        void 0 === n && (n = rt.Z), void 0 === r && (r = null), this.state = t, this.targetIds = e, 
        this.resumeToken = n, this.cause = r;
    }, Vt = /** @class */ function() {
        function t() {
            /**
             * The number of pending responses (adds or removes) that we are waiting on.
             * We only consider targets active that have no pending responses.
             */
            this.oe = 0, 
            /**
                 * Keeps track of the document changes since the last raised snapshot.
                 *
                 * These changes are continuously updated as we receive document updates and
                 * always reflect the current set of changes against the last issued snapshot.
                 */
            this.ae = Rt(), 
            /** See public getters for explanations of these fields. */
            this.ce = rt.Z, this.ue = !1, 
            /**
                 * Whether this target state should be included in the next snapshot. We
                 * initialize to true so that newly-added targets are included in the next
                 * RemoteEvent.
                 */
            this.he = !0;
        }
        return Object.defineProperty(t.prototype, "Zt", {
            /**
             * Whether this target has been marked 'current'.
             *
             * 'Current' has special meaning in the RPC protocol: It implies that the
             * Watch backend has sent us all changes up to the point at which the target
             * was added and that the target is consistent with the rest of the watch
             * stream.
             */
            get: function() {
                return this.ue;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "resumeToken", {
            /** The last resume token sent to us for this target. */ get: function() {
                return this.ce;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "le", {
            /** Whether this target has pending target adds or target removes. */ get: function() {
                return 0 !== this.oe;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "_e", {
            /** Whether we have modified any state that should trigger a snapshot. */ get: function() {
                return this.he;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Applies the resume token to the TargetChange, but only when it has a new
         * value. Empty resumeTokens are discarded.
         */
        t.prototype.fe = function(t) {
            t.X() > 0 && (this.he = !0, this.ce = t);
        }, 
        /**
         * Creates a target change from the current set of changes.
         *
         * To reset the document changes after raising this snapshot, call
         * `clearPendingChanges()`.
         */
        t.prototype.de = function() {
            var t = It(), e = It(), n = It();
            return this.ae.forEach((function(r, i) {
                switch (i) {
                  case 0 /* Added */ :
                    t = t.add(r);
                    break;

                  case 2 /* Modified */ :
                    e = e.add(r);
                    break;

                  case 1 /* Removed */ :
                    n = n.add(r);
                    break;

                  default:
                    S$1();
                }
            })), new kt(this.ce, this.ue, t, e, n);
        }, 
        /**
         * Resets the document changes and sets `hasPendingChanges` to false.
         */
        t.prototype.we = function() {
            this.he = !1, this.ae = Rt();
        }, t.prototype.Te = function(t, e) {
            this.he = !0, this.ae = this.ae.rt(t, e);
        }, t.prototype.Ee = function(t) {
            this.he = !0, this.ae = this.ae.remove(t);
        }, t.prototype.Ie = function() {
            this.oe += 1;
        }, t.prototype.me = function() {
            this.oe -= 1;
        }, t.prototype.Ae = function() {
            this.he = !0, this.ue = !0;
        }, t;
    }(), Ct = /** @class */ function() {
        function t(t) {
            this.Re = t, 
            /** The internal state of all tracked targets. */
            this.Pe = new Map, 
            /** Keeps track of the documents to update since the last raised snapshot. */
            this.ge = yt(), 
            /** A mapping of document keys to their set of target IDs. */
            this.Ve = Lt(), 
            /**
                 * A list of targets with existence filter mismatches. These targets are
                 * known to be inconsistent and their listens needs to be re-established by
                 * RemoteStore.
                 */
            this.ye = new pt(V$1)
            /**
         * Processes and adds the DocumentWatchChange to the current set of changes.
         */;
        }
        return t.prototype.pe = function(t) {
            for (var e = 0, n = t.se; e < n.length; e++) {
                var r = n[e];
                t.ie instanceof bn ? this.ve(r, t.ie) : t.ie instanceof _n && this.be(r, t.key, t.ie);
            }
            for (var i = 0, o = t.removedTargetIds; i < o.length; i++) {
                var u = o[i];
                this.be(u, t.key, t.ie);
            }
        }, 
        /** Processes and adds the WatchTargetChange to the current set of changes. */ t.prototype.Se = function(t) {
            var e = this;
            this.De(t, (function(n) {
                var r = e.Ce(n);
                switch (t.state) {
                  case 0 /* NoChange */ :
                    e.Ne(n) && r.fe(t.resumeToken);
                    break;

                  case 1 /* Added */ :
                    // We need to decrement the number of pending acks needed from watch
                    // for this targetId.
                    r.me(), r.le || 
                    // We have a freshly added target, so we need to reset any state
                    // that we had previously. This can happen e.g. when remove and add
                    // back a target for existence filter mismatches.
                    r.we(), r.fe(t.resumeToken);
                    break;

                  case 2 /* Removed */ :
                    // We need to keep track of removed targets to we can post-filter and
                    // remove any target changes.
                    // We need to decrement the number of pending acks needed from watch
                    // for this targetId.
                    r.me(), r.le || e.removeTarget(n);
                    break;

                  case 3 /* Current */ :
                    e.Ne(n) && (r.Ae(), r.fe(t.resumeToken));
                    break;

                  case 4 /* Reset */ :
                    e.Ne(n) && (
                    // Reset the target and synthesizes removes for all existing
                    // documents. The backend will re-add any documents that still
                    // match the target before it sends the next global snapshot.
                    e.xe(n), r.fe(t.resumeToken));
                    break;

                  default:
                    S$1();
                }
            }));
        }, 
        /**
         * Iterates over all targetIds that the watch change applies to: either the
         * targetIds explicitly listed in the change or the targetIds of all currently
         * active targets.
         */
        t.prototype.De = function(t, e) {
            var n = this;
            t.targetIds.length > 0 ? t.targetIds.forEach(e) : this.Pe.forEach((function(t, r) {
                n.Ne(r) && e(r);
            }));
        }, 
        /**
         * Handles existence filters and synthesizes deletes for filter mismatches.
         * Targets that are invalidated by filter mismatches are added to
         * `pendingTargetResets`.
         */
        t.prototype.Fe = function(t) {
            var e = t.targetId, n = t.re.count, r = this.Oe(e);
            if (r) {
                var i = r.target;
                if (nt(i)) if (0 === n) {
                    // The existence filter told us the document does not exist. We deduce
                    // that this document does not exist and apply a deleted document to
                    // our updates. Without applying this deleted document there might be
                    // another query that will raise this document as part of a snapshot
                    // until it is resolved, essentially exposing inconsistency between
                    // queries.
                    var o = new Y$1(i.path);
                    this.be(e, o, new _n(o, z.min()));
                } else k$1(1 === n); else this.Me(e) !== n && (
                // Existence filter mismatch: We reset the mapping and raise a new
                // snapshot with `isFromCache:true`.
                this.xe(e), this.ye = this.ye.add(e));
            }
        }, 
        /**
         * Converts the currently accumulated state into a remote event at the
         * provided snapshot version. Resets the accumulated changes before returning.
         */
        t.prototype.ke = function(t) {
            var e = this, n = new Map;
            this.Pe.forEach((function(r, i) {
                var o = e.Oe(i);
                if (o) {
                    if (r.Zt && nt(o.target)) {
                        // Document queries for document that don't exist can produce an empty
                        // result set. To update our local cache, we synthesize a document
                        // delete if we have not previously received the document. This
                        // resolves the limbo state of the document, removing it from
                        // limboDocumentRefs.
                        // TODO(dimond): Ideally we would have an explicit lookup target
                        // instead resulting in an explicit delete message and we could
                        // remove this special logic.
                        var u = new Y$1(o.target.path);
                        null !== e.ge.get(u) || e.$e(i, u) || e.be(i, u, new _n(u, t));
                    }
                    r._e && (n.set(i, r.de()), r.we());
                }
            }));
            var r = It();
            // We extract the set of limbo-only document updates as the GC logic
            // special-cases documents that do not appear in the target cache.
            // TODO(gsoltis): Expand on this comment once GC is available in the JS
            // client.
                    this.Ve.forEach((function(t, n) {
                var i = !0;
                n.xt((function(t) {
                    var n = e.Oe(t);
                    return !n || 2 /* LimboResolution */ === n.tt || (i = !1, !1);
                })), i && (r = r.add(t));
            }));
            var i = new St(t, n, this.ye, this.ge, r);
            return this.ge = yt(), this.Ve = Lt(), this.ye = new pt(V$1), i;
        }, 
        /**
         * Adds the provided document to the internal list of document updates and
         * its document key to the given target's mapping.
         */
        // Visible for testing.
        t.prototype.ve = function(t, e) {
            if (this.Ne(t)) {
                var n = this.$e(t, e.key) ? 2 /* Modified */ : 0 /* Added */;
                this.Ce(t).Te(e.key, n), this.ge = this.ge.rt(e.key, e), this.Ve = this.Ve.rt(e.key, this.Le(e.key).add(t));
            }
        }, 
        /**
         * Removes the provided document from the target mapping. If the
         * document no longer matches the target, but the document's state is still
         * known (e.g. we know that the document was deleted or we received the change
         * that caused the filter mismatch), the new document can be provided
         * to update the remote document cache.
         */
        // Visible for testing.
        t.prototype.be = function(t, e, n) {
            if (this.Ne(t)) {
                var r = this.Ce(t);
                this.$e(t, e) ? r.Te(e, 1 /* Removed */) : 
                // The document may have entered and left the target before we raised a
                // snapshot, so we can just ignore the change.
                r.Ee(e), this.Ve = this.Ve.rt(e, this.Le(e).delete(t)), n && (this.ge = this.ge.rt(e, n));
            }
        }, t.prototype.removeTarget = function(t) {
            this.Pe.delete(t);
        }, 
        /**
         * Returns the current count of documents in the target. This includes both
         * the number of documents that the LocalStore considers to be part of the
         * target as well as any accumulated changes.
         */
        t.prototype.Me = function(t) {
            var e = this.Ce(t).de();
            return this.Re.Be(t).size + e.te.size - e.ne.size;
        }, 
        /**
         * Increment the number of acks needed from watch before we can consider the
         * server to be 'in-sync' with the client's active targets.
         */
        t.prototype.Ie = function(t) {
            this.Ce(t).Ie();
        }, t.prototype.Ce = function(t) {
            var e = this.Pe.get(t);
            return e || (e = new Vt, this.Pe.set(t, e)), e;
        }, t.prototype.Le = function(t) {
            var e = this.Ve.get(t);
            return e || (e = new pt(V$1), this.Ve = this.Ve.rt(t, e)), e;
        }, 
        /**
         * Verifies that the user is still interested in this target (by calling
         * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
         * from watch.
         */
        t.prototype.Ne = function(t) {
            var e = null !== this.Oe(t);
            return e || T$1("WatchChangeAggregator", "Detected inactive target", t), e;
        }, 
        /**
         * Returns the TargetData for an active target (i.e. a target that the user
         * is still interested in that has no outstanding target change requests).
         */
        t.prototype.Oe = function(t) {
            var e = this.Pe.get(t);
            return e && e.le ? null : this.Re.qe(t);
        }, 
        /**
         * Resets the state of a Watch target to its initial state (e.g. sets
         * 'current' to false, clears the resume token and removes its target mapping
         * from all documents).
         */
        t.prototype.xe = function(t) {
            var e = this;
            this.Pe.set(t, new Vt), this.Re.Be(t).forEach((function(n) {
                e.be(t, n, /*updatedDocument=*/ null);
            }));
        }, 
        /**
         * Returns whether the LocalStore considers the document to be part of the
         * specified target.
         */
        t.prototype.$e = function(t, e) {
            return this.Re.Be(t).has(e);
        }, t;
    }();

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * DocumentChangeSet keeps track of a set of changes to docs in a query, merging
     * duplicate events for the same doc.
     */ function Lt() {
        return new ht(Y$1.V);
    }

    function Rt() {
        return new ht(Y$1.V);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a locally-applied ServerTimestamp.
     *
     * Server Timestamps are backed by MapValues that contain an internal field
     * `__type__` with a value of `server_timestamp`. The previous value and local
     * write time are stored in its `__previous_value__` and `__local_write_time__`
     * fields respectively.
     *
     * Notes:
     * - ServerTimestampValue instances are created as the result of applying a
     *   TransformMutation (see TransformMutation.applyTo()). They can only exist in
     *   the local view of a document. Therefore they do not need to be parsed or
     *   serialized.
     * - When evaluated locally (e.g. for snapshot.data()), they by default
     *   evaluate to `null`. This behavior can be configured by passing custom
     *   FieldValueOptions to value().
     * - With respect to other ServerTimestampValues, they sort by their
     *   localWriteTime.
     */ function Mt(t) {
        var e, n;
        return "server_timestamp" === (null === (n = ((null === (e = null == t ? void 0 : t.mapValue) || void 0 === e ? void 0 : e.fields) || {}).__type__) || void 0 === n ? void 0 : n.stringValue);
    }

    /**
     * Creates a new ServerTimestamp proto value (using the internal format).
     */
    /**
     * Returns the value of the field before this ServerTimestamp was set.
     *
     * Preserving the previous values allows the user to display the last resoled
     * value until the backend responds with the timestamp.
     */ function Ut(t) {
        var e = t.mapValue.fields.__previous_value__;
        return Mt(e) ? Ut(e) : e;
    }

    /**
     * Returns the local time at which this timestamp was first set.
     */ function qt(t) {
        var e = Yt(t.mapValue.fields.__local_write_time__.timestampValue);
        return new B(e.seconds, e.nanos);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // A RegExp matching ISO 8601 UTC timestamps with optional fraction.
    var Ft = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

    /** Extracts the backend's type order for the provided value. */ function jt(t) {
        return "nullValue" in t ? 0 /* NullValue */ : "booleanValue" in t ? 1 /* BooleanValue */ : "integerValue" in t || "doubleValue" in t ? 2 /* NumberValue */ : "timestampValue" in t ? 3 /* TimestampValue */ : "stringValue" in t ? 5 /* StringValue */ : "bytesValue" in t ? 6 /* BlobValue */ : "referenceValue" in t ? 7 /* RefValue */ : "geoPointValue" in t ? 8 /* GeoPointValue */ : "arrayValue" in t ? 9 /* ArrayValue */ : "mapValue" in t ? Mt(t) ? 4 /* ServerTimestampValue */ : 10 /* ObjectValue */ : S$1();
    }

    /** Tests `left` and `right` for equality based on the backend semantics. */ function Bt(t, e) {
        var n = jt(t);
        if (n !== jt(e)) return !1;
        switch (n) {
          case 0 /* NullValue */ :
            return !0;

          case 1 /* BooleanValue */ :
            return t.booleanValue === e.booleanValue;

          case 4 /* ServerTimestampValue */ :
            return qt(t).isEqual(qt(e));

          case 3 /* TimestampValue */ :
            return function(t, e) {
                if ("string" == typeof t.timestampValue && "string" == typeof e.timestampValue && t.timestampValue.length === e.timestampValue.length) 
                // Use string equality for ISO 8601 timestamps
                return t.timestampValue === e.timestampValue;
                var n = Yt(t.timestampValue), r = Yt(e.timestampValue);
                return n.seconds === r.seconds && n.nanos === r.nanos;
            }(t, e);

          case 5 /* StringValue */ :
            return t.stringValue === e.stringValue;

          case 6 /* BlobValue */ :
            return function(t, e) {
                return Jt(t.bytesValue).isEqual(Jt(e.bytesValue));
            }(t, e);

          case 7 /* RefValue */ :
            return t.referenceValue === e.referenceValue;

          case 8 /* GeoPointValue */ :
            return function(t, e) {
                return Ht(t.geoPointValue.latitude) === Ht(e.geoPointValue.latitude) && Ht(t.geoPointValue.longitude) === Ht(e.geoPointValue.longitude);
            }(t, e);

          case 2 /* NumberValue */ :
            return function(t, e) {
                if ("integerValue" in t && "integerValue" in e) return Ht(t.integerValue) === Ht(e.integerValue);
                if ("doubleValue" in t && "doubleValue" in e) {
                    var n = Ht(t.doubleValue), r = Ht(e.doubleValue);
                    return n === r ? J$1(n) === J$1(r) : isNaN(n) && isNaN(r);
                }
                return !1;
            }(t, e);

          case 9 /* ArrayValue */ :
            return C$1(t.arrayValue.values || [], e.arrayValue.values || [], Bt);

          case 10 /* ObjectValue */ :
            return function(t, e) {
                var n = t.mapValue.fields || {}, r = e.mapValue.fields || {};
                if (R$1(n) !== R$1(r)) return !1;
                for (var i in n) if (n.hasOwnProperty(i) && (void 0 === r[i] || !Bt(n[i], r[i]))) return !1;
                return !0;
            }(t, e);

          default:
            return S$1();
        }
    }

    function zt(t, e) {
        return void 0 !== (t.values || []).find((function(t) {
            return Bt(t, e);
        }));
    }

    function Gt(t, e) {
        var n = jt(t), r = jt(e);
        if (n !== r) return V$1(n, r);
        switch (n) {
          case 0 /* NullValue */ :
            return 0;

          case 1 /* BooleanValue */ :
            return V$1(t.booleanValue, e.booleanValue);

          case 2 /* NumberValue */ :
            return function(t, e) {
                var n = Ht(t.integerValue || t.doubleValue), r = Ht(e.integerValue || e.doubleValue);
                return n < r ? -1 : n > r ? 1 : n === r ? 0 : 
                // one or both are NaN.
                isNaN(n) ? isNaN(r) ? 0 : -1 : 1;
            }(t, e);

          case 3 /* TimestampValue */ :
            return Kt(t.timestampValue, e.timestampValue);

          case 4 /* ServerTimestampValue */ :
            return Kt(qt(t), qt(e));

          case 5 /* StringValue */ :
            return V$1(t.stringValue, e.stringValue);

          case 6 /* BlobValue */ :
            return function(t, e) {
                var n = Jt(t), r = Jt(e);
                return n.A(r);
            }(t.bytesValue, e.bytesValue);

          case 7 /* RefValue */ :
            return function(t, e) {
                for (var n = t.split("/"), r = e.split("/"), i = 0; i < n.length && i < r.length; i++) {
                    var o = V$1(n[i], r[i]);
                    if (0 !== o) return o;
                }
                return V$1(n.length, r.length);
            }(t.referenceValue, e.referenceValue);

          case 8 /* GeoPointValue */ :
            return function(t, e) {
                var n = V$1(Ht(t.latitude), Ht(e.latitude));
                return 0 !== n ? n : V$1(Ht(t.longitude), Ht(e.longitude));
            }(t.geoPointValue, e.geoPointValue);

          case 9 /* ArrayValue */ :
            return function(t, e) {
                for (var n = t.values || [], r = e.values || [], i = 0; i < n.length && i < r.length; ++i) {
                    var o = Gt(n[i], r[i]);
                    if (o) return o;
                }
                return V$1(n.length, r.length);
            }(t.arrayValue, e.arrayValue);

          case 10 /* ObjectValue */ :
            return function(t, e) {
                var n = t.fields || {}, r = Object.keys(n), i = e.fields || {}, o = Object.keys(i);
                // Even though MapValues are likely sorted correctly based on their insertion
                // order (e.g. when received from the backend), local modifications can bring
                // elements out of order. We need to re-sort the elements to ensure that
                // canonical IDs are independent of insertion order.
                            r.sort(), o.sort();
                for (var u = 0; u < r.length && u < o.length; ++u) {
                    var s = V$1(r[u], o[u]);
                    if (0 !== s) return s;
                    var a = Gt(n[r[u]], i[o[u]]);
                    if (0 !== a) return a;
                }
                return V$1(r.length, o.length);
            }(t.mapValue, e.mapValue);

          default:
            throw S$1();
        }
    }

    function Kt(t, e) {
        if ("string" == typeof t && "string" == typeof e && t.length === e.length) return V$1(t, e);
        var n = Yt(t), r = Yt(e), i = V$1(n.seconds, r.seconds);
        return 0 !== i ? i : V$1(n.nanos, r.nanos);
    }

    function Qt(t) {
        return Wt(t);
    }

    function Wt(t) {
        return "nullValue" in t ? "null" : "booleanValue" in t ? "" + t.booleanValue : "integerValue" in t ? "" + t.integerValue : "doubleValue" in t ? "" + t.doubleValue : "timestampValue" in t ? function(t) {
            var e = Yt(t);
            return "time(" + e.seconds + "," + e.nanos + ")";
        }(t.timestampValue) : "stringValue" in t ? t.stringValue : "bytesValue" in t ? Jt(t.bytesValue).toBase64() : "referenceValue" in t ? (n = t.referenceValue, 
        Y$1.W(n).toString()) : "geoPointValue" in t ? "geo(" + (e = t.geoPointValue).latitude + "," + e.longitude + ")" : "arrayValue" in t ? function(t) {
            for (var e = "[", n = !0, r = 0, i = t.values || []; r < i.length; r++) {
                n ? n = !1 : e += ",", e += Wt(i[r]);
            }
            return e + "]";
        }(t.arrayValue) : "mapValue" in t ? function(t) {
            for (
            // Iteration order in JavaScript is not guaranteed. To ensure that we generate
            // matching canonical IDs for identical maps, we need to sort the keys.
            var e = "{", n = !0, r = 0, i = Object.keys(t.fields || {}).sort(); r < i.length; r++) {
                var o = i[r];
                n ? n = !1 : e += ",", e += o + ":" + Wt(t.fields[o]);
            }
            return e + "}";
        }(t.mapValue) : S$1();
        var e, n;
    }

    function Yt(t) {
        // The json interface (for the browser) will return an iso timestamp string,
        // while the proto js library (for node) will return a
        // google.protobuf.Timestamp instance.
        if (k$1(!!t), "string" == typeof t) {
            // The date string can have higher precision (nanos) than the Date class
            // (millis), so we do some custom parsing here.
            // Parse the nanos right out of the string.
            var e = 0, n = Ft.exec(t);
            if (k$1(!!n), n[1]) {
                // Pad the fraction out to 9 digits (nanos).
                var r = n[1];
                r = (r + "000000000").substr(0, 9), e = Number(r);
            }
            // Parse the date to get the seconds.
                    var i = new Date(t);
            return {
                seconds: Math.floor(i.getTime() / 1e3),
                nanos: e
            };
        }
        return {
            seconds: Ht(t.seconds),
            nanos: Ht(t.nanos)
        };
    }

    /**
     * Converts the possible Proto types for numbers into a JavaScript number.
     * Returns 0 if the value is not numeric.
     */ function Ht(t) {
        // TODO(bjornick): Handle int64 greater than 53 bits.
        return "number" == typeof t ? t : "string" == typeof t ? Number(t) : 0;
    }

    /** Converts the possible Proto types for Blobs into a ByteString. */ function Jt(t) {
        return "string" == typeof t ? rt.fromBase64String(t) : rt.fromUint8Array(t);
    }

    /** Returns a reference value for the provided database and key. */ function Xt(t, e) {
        return {
            referenceValue: "projects/" + t.projectId + "/databases/" + t.database + "/documents/" + e.path.M()
        };
    }

    /** Returns true if `value` is an IntegerValue . */ function $t(t) {
        return !!t && "integerValue" in t;
    }

    /** Returns true if `value` is a DoubleValue. */
    /** Returns true if `value` is an ArrayValue. */ function Zt(t) {
        return !!t && "arrayValue" in t;
    }

    /** Returns true if `value` is a NullValue. */ function te(t) {
        return !!t && "nullValue" in t;
    }

    /** Returns true if `value` is NaN. */ function ee(t) {
        return !!t && "doubleValue" in t && isNaN(Number(t.doubleValue));
    }

    /** Returns true if `value` is a MapValue. */ function ne(t) {
        return !!t && "mapValue" in t;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var re = {
        asc: "ASCENDING",
        desc: "DESCENDING"
    }, ie = {
        "<": "LESS_THAN",
        "<=": "LESS_THAN_OR_EQUAL",
        ">": "GREATER_THAN",
        ">=": "GREATER_THAN_OR_EQUAL",
        "==": "EQUAL",
        "!=": "NOT_EQUAL",
        "array-contains": "ARRAY_CONTAINS",
        in: "IN",
        "not-in": "NOT_IN",
        "array-contains-any": "ARRAY_CONTAINS_ANY"
    }, oe = function(t, e) {
        this.t = t, this.Ue = e;
    };

    /**
     * This class generates JsonObject values for the Datastore API suitable for
     * sending to either GRPC stub methods or via the JSON/HTTP REST API.
     *
     * The serializer supports both Protobuf.js and Proto3 JSON formats. By
     * setting `useProto3Json` to true, the serializer will use the Proto3 JSON
     * format.
     *
     * For a description of the Proto3 JSON format check
     * https://developers.google.com/protocol-buffers/docs/proto3#json
     *
     * TODO(klimt): We can remove the databaseId argument if we keep the full
     * resource name in documents.
     */
    /**
     * Returns an IntegerValue for `value`.
     */
    function ue(t) {
        return {
            integerValue: "" + t
        };
    }

    /**
     * Returns an DoubleValue for `value` that is encoded based the serializer's
     * `useProto3Json` setting.
     */ function se(t, e) {
        if (t.Ue) {
            if (isNaN(e)) return {
                doubleValue: "NaN"
            };
            if (e === 1 / 0) return {
                doubleValue: "Infinity"
            };
            if (e === -1 / 0) return {
                doubleValue: "-Infinity"
            };
        }
        return {
            doubleValue: J$1(e) ? "-0" : e
        };
    }

    /**
     * Returns a value for a number that's appropriate to put into a proto.
     * The return value is an IntegerValue if it can safely represent the value,
     * otherwise a DoubleValue is returned.
     */ function ae(t, e) {
        return X$1(e) ? ue(e) : se(t, e);
    }

    /**
     * Returns a value for a Date that's appropriate to put into a proto.
     */ function ce(t, e) {
        return t.Ue ? new Date(1e3 * e.seconds).toISOString().replace(/\.\d*/, "").replace("Z", "") + "." + ("000000000" + e.nanoseconds).slice(-9) + "Z" : {
            seconds: "" + e.seconds,
            nanos: e.nanoseconds
        };
    }

    /**
     * Returns a value for bytes that's appropriate to put in a proto.
     *
     * Visible for testing.
     */ function he(t, e) {
        return t.Ue ? e.toBase64() : e.toUint8Array();
    }

    /**
     * Returns a ByteString based on the proto string value.
     */ function fe(t, e) {
        return ce(t, e.P());
    }

    function le(t) {
        return k$1(!!t), z.m(function(t) {
            var e = Yt(t);
            return new B(e.seconds, e.nanos);
        }(t));
    }

    function pe(t, e) {
        return function(t) {
            return new K$1([ "projects", t.projectId, "databases", t.database ]);
        }(t).child("documents").child(e).M();
    }

    function de(t) {
        var e = K$1.k(t);
        return k$1(Me(e)), e;
    }

    function ve(t, e) {
        return pe(t.t, e.path);
    }

    function ye(t, e) {
        var n = de(e);
        if (n.get(1) !== t.t.projectId) throw new j(F$1.INVALID_ARGUMENT, "Tried to deserialize key from different project: " + n.get(1) + " vs " + t.t.projectId);
        if (n.get(3) !== t.t.database) throw new j(F$1.INVALID_ARGUMENT, "Tried to deserialize key from different database: " + n.get(3) + " vs " + t.t.database);
        return new Y$1(be(n));
    }

    function ge(t, e) {
        return pe(t.t, e);
    }

    function me(t) {
        var e = de(t);
        // In v1beta1 queries for collections at the root did not have a trailing
        // "/documents". In v1 all resource paths contain "/documents". Preserve the
        // ability to read the v1beta1 form for compatibility with queries persisted
        // in the local target cache.
            return 4 === e.length ? K$1.$() : be(e);
    }

    function we(t) {
        return new K$1([ "projects", t.t.projectId, "databases", t.t.database ]).M();
    }

    function be(t) {
        return k$1(t.length > 4 && "documents" === t.get(4)), t.v(5)
        /** Creates a Document proto from key and fields (but no create/update time) */;
    }

    function _e(t, e, n) {
        return {
            name: ve(t, e),
            fields: n.proto.mapValue.fields
        };
    }

    function Ie(t, e) {
        var n;
        if (e instanceof an) n = {
            update: _e(t, e.key, e.value)
        }; else if (e instanceof dn) n = {
            delete: ve(t, e.key)
        }; else if (e instanceof cn) n = {
            update: _e(t, e.key, e.data),
            updateMask: Re(e.Qe)
        }; else if (e instanceof fn) n = {
            transform: {
                document: ve(t, e.key),
                fieldTransforms: e.fieldTransforms.map((function(t) {
                    return function(t, e) {
                        var n = e.transform;
                        if (n instanceof Be) return {
                            fieldPath: e.field.M(),
                            setToServerValue: "REQUEST_TIME"
                        };
                        if (n instanceof ze) return {
                            fieldPath: e.field.M(),
                            appendMissingElements: {
                                values: n.elements
                            }
                        };
                        if (n instanceof Ke) return {
                            fieldPath: e.field.M(),
                            removeAllFromArray: {
                                values: n.elements
                            }
                        };
                        if (n instanceof We) return {
                            fieldPath: e.field.M(),
                            increment: n.Ke
                        };
                        throw S$1();
                    }(0, t);
                }))
            }
        }; else {
            if (!(e instanceof vn)) return S$1();
            n = {
                verify: ve(t, e.key)
            };
        }
        return e.je.We || (n.currentDocument = function(t, e) {
            return void 0 !== e.updateTime ? {
                updateTime: fe(t, e.updateTime)
            } : void 0 !== e.exists ? {
                exists: e.exists
            } : S$1();
        }(t, e.je)), n;
    }

    function Ee(t, e) {
        var n = e.currentDocument ? function(t) {
            return void 0 !== t.updateTime ? Ze.updateTime(le(t.updateTime)) : void 0 !== t.exists ? Ze.exists(t.exists) : Ze.Ge();
        }(e.currentDocument) : Ze.Ge();
        if (e.update) {
            e.update.name;
            var r = ye(t, e.update.name), i = new yn({
                mapValue: {
                    fields: e.update.fields
                }
            });
            if (e.updateMask) {
                var o = function(t) {
                    var e = t.fieldPaths || [];
                    return new Je(e.map((function(t) {
                        return W$1.U(t);
                    })));
                }(e.updateMask);
                return new cn(r, i, o, n);
            }
            return new an(r, i, n);
        }
        if (e.delete) {
            var u = ye(t, e.delete);
            return new dn(u, n);
        }
        if (e.transform) {
            var s = ye(t, e.transform.document), a = e.transform.fieldTransforms.map((function(e) {
                return function(t, e) {
                    var n = null;
                    if ("setToServerValue" in e) k$1("REQUEST_TIME" === e.setToServerValue), n = new Be; else if ("appendMissingElements" in e) {
                        var r = e.appendMissingElements.values || [];
                        n = new ze(r);
                    } else if ("removeAllFromArray" in e) {
                        var i = e.removeAllFromArray.values || [];
                        n = new Ke(i);
                    } else "increment" in e ? n = new We(t, e.increment) : S$1();
                    var o = W$1.U(e.fieldPath);
                    return new Xe(o, n);
                }(t, e);
            }));
            return k$1(!0 === n.exists), new fn(s, a);
        }
        if (e.verify) {
            var c = ye(t, e.verify);
            return new vn(c, n);
        }
        return S$1();
    }

    function Te(t, e) {
        return {
            documents: [ ge(t, e.path) ]
        };
    }

    function Ne(t, e) {
        // Dissect the path into parent, collectionId, and optional key filter.
        var n = {
            structuredQuery: {}
        }, r = e.path;
        null !== e.collectionGroup ? (n.parent = ge(t, r), n.structuredQuery.from = [ {
            collectionId: e.collectionGroup,
            allDescendants: !0
        } ]) : (n.parent = ge(t, r.S()), n.structuredQuery.from = [ {
            collectionId: r.C()
        } ]);
        var i = function(t) {
            if (0 !== t.length) {
                var e = t.map((function(t) {
                    // visible for testing
                    return function(t) {
                        if ("==" /* EQUAL */ === t.op) {
                            if (ee(t.value)) return {
                                unaryFilter: {
                                    field: Pe(t.field),
                                    op: "IS_NAN"
                                }
                            };
                            if (te(t.value)) return {
                                unaryFilter: {
                                    field: Pe(t.field),
                                    op: "IS_NULL"
                                }
                            };
                        } else if ("!=" /* NOT_EQUAL */ === t.op) {
                            if (ee(t.value)) return {
                                unaryFilter: {
                                    field: Pe(t.field),
                                    op: "IS_NOT_NAN"
                                }
                            };
                            if (te(t.value)) return {
                                unaryFilter: {
                                    field: Pe(t.field),
                                    op: "IS_NOT_NULL"
                                }
                            };
                        }
                        return {
                            fieldFilter: {
                                field: Pe(t.field),
                                op: Oe(t.op),
                                value: t.value
                            }
                        };
                    }(t);
                }));
                return 1 === e.length ? e[0] : {
                    compositeFilter: {
                        op: "AND",
                        filters: e
                    }
                };
            }
        }(e.filters);
        i && (n.structuredQuery.where = i);
        var o = function(t) {
            if (0 !== t.length) return t.map((function(t) {
                // visible for testing
                return function(t) {
                    return {
                        field: Pe(t.field),
                        direction: De(t.dir)
                    };
                }(t);
            }));
        }(e.orderBy);
        o && (n.structuredQuery.orderBy = o);
        var u = function(t, e) {
            return t.Ue || H$1(e) ? e : {
                value: e
            };
        }(t, e.limit);
        return null !== u && (n.structuredQuery.limit = u), e.startAt && (n.structuredQuery.startAt = Se(e.startAt)), 
        e.endAt && (n.structuredQuery.endAt = Se(e.endAt)), n;
    }

    function xe(t) {
        var e = me(t.parent), n = t.structuredQuery, r = n.from ? n.from.length : 0, i = null;
        if (r > 0) {
            k$1(1 === r);
            var o = n.from[0];
            o.allDescendants ? i = o.collectionId : e = e.child(o.collectionId);
        }
        var u = [];
        n.where && (u = Ae(n.where));
        var s = [];
        n.orderBy && (s = n.orderBy.map((function(t) {
            return function(t) {
                return new tr(Ve(t.field), 
                // visible for testing
                function(t) {
                    switch (t) {
                      case "ASCENDING":
                        return "asc" /* ASCENDING */;

                      case "DESCENDING":
                        return "desc" /* DESCENDING */;

                      default:
                        return;
                    }
                }(t.direction));
            }(t);
        })));
        var a = null;
        n.limit && (a = function(t) {
            var e;
            return H$1(e = "object" == typeof t ? t.value : t) ? null : e;
        }(n.limit));
        var c = null;
        n.startAt && (c = ke(n.startAt));
        var h = null;
        return n.endAt && (h = ke(n.endAt)), Tn(e, i, s, u, a, "F" /* First */ , c, h);
    }

    function Ae(t) {
        return t ? void 0 !== t.unaryFilter ? [ Le(t) ] : void 0 !== t.fieldFilter ? [ Ce(t) ] : void 0 !== t.compositeFilter ? t.compositeFilter.filters.map((function(t) {
            return Ae(t);
        })).reduce((function(t, e) {
            return t.concat(e);
        })) : S$1() : [];
    }

    function Se(t) {
        return {
            before: t.before,
            values: t.position
        };
    }

    function ke(t) {
        var e = !!t.before, n = t.values || [];
        return new Jn(n, e);
    }

    // visible for testing
    function De(t) {
        return re[t];
    }

    function Oe(t) {
        return ie[t];
    }

    function Pe(t) {
        return {
            fieldPath: t.M()
        };
    }

    function Ve(t) {
        return W$1.U(t.fieldPath);
    }

    function Ce(t) {
        return jn.create(Ve(t.fieldFilter.field), function(t) {
            switch (t) {
              case "EQUAL":
                return "==" /* EQUAL */;

              case "NOT_EQUAL":
                return "!=" /* NOT_EQUAL */;

              case "GREATER_THAN":
                return ">" /* GREATER_THAN */;

              case "GREATER_THAN_OR_EQUAL":
                return ">=" /* GREATER_THAN_OR_EQUAL */;

              case "LESS_THAN":
                return "<" /* LESS_THAN */;

              case "LESS_THAN_OR_EQUAL":
                return "<=" /* LESS_THAN_OR_EQUAL */;

              case "ARRAY_CONTAINS":
                return "array-contains" /* ARRAY_CONTAINS */;

              case "IN":
                return "in" /* IN */;

              case "NOT_IN":
                return "not-in" /* NOT_IN */;

              case "ARRAY_CONTAINS_ANY":
                return "array-contains-any" /* ARRAY_CONTAINS_ANY */;

              case "OPERATOR_UNSPECIFIED":
              default:
                return S$1();
            }
        }(t.fieldFilter.op), t.fieldFilter.value);
    }

    function Le(t) {
        switch (t.unaryFilter.op) {
          case "IS_NAN":
            var e = Ve(t.unaryFilter.field);
            return jn.create(e, "==" /* EQUAL */ , {
                doubleValue: NaN
            });

          case "IS_NULL":
            var n = Ve(t.unaryFilter.field);
            return jn.create(n, "==" /* EQUAL */ , {
                nullValue: "NULL_VALUE"
            });

          case "IS_NOT_NAN":
            var r = Ve(t.unaryFilter.field);
            return jn.create(r, "!=" /* NOT_EQUAL */ , {
                doubleValue: NaN
            });

          case "IS_NOT_NULL":
            var i = Ve(t.unaryFilter.field);
            return jn.create(i, "!=" /* NOT_EQUAL */ , {
                nullValue: "NULL_VALUE"
            });

          case "OPERATOR_UNSPECIFIED":
          default:
            return S$1();
        }
    }

    function Re(t) {
        var e = [];
        return t.fields.forEach((function(t) {
            return e.push(t.M());
        })), {
            fieldPaths: e
        };
    }

    function Me(t) {
        // Resource names have at least 4 components (project ID, database ID)
        return t.length >= 4 && "projects" === t.get(0) && "databases" === t.get(2);
    }

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Represents a transform within a TransformMutation. */ var Ue = function() {
        // Make sure that the structural type of `TransformOperation` is unique.
        // See https://github.com/microsoft/TypeScript/issues/5451
        this.ze = void 0;
    };

    /**
     * Computes the local transform result against the provided `previousValue`,
     * optionally using the provided localWriteTime.
     */ function qe(t, e, n) {
        return t instanceof Be ? function(t, e) {
            var n = {
                fields: {
                    __type__: {
                        stringValue: "server_timestamp"
                    },
                    __local_write_time__: {
                        timestampValue: {
                            seconds: t.seconds,
                            nanos: t.nanoseconds
                        }
                    }
                }
            };
            return e && (n.fields.__previous_value__ = e), {
                mapValue: n
            };
        }(n, e) : t instanceof ze ? Ge(t, e) : t instanceof Ke ? Qe(t, e) : function(t, e) {
            // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
            // precision and resolves overflows by reducing precision, we do not
            // manually cap overflows at 2^63.
            var n = je(t, e), r = Ye(n) + Ye(t.Ke);
            return $t(n) && $t(t.Ke) ? ue(r) : se(t.serializer, r);
        }(t, e);
    }

    /**
     * Computes a final transform result after the transform has been acknowledged
     * by the server, potentially using the server-provided transformResult.
     */ function Fe(t, e, n) {
        // The server just sends null as the transform result for array operations,
        // so we have to calculate a result the same as we do for local
        // applications.
        return t instanceof ze ? Ge(t, e) : t instanceof Ke ? Qe(t, e) : n;
    }

    /**
     * If this transform operation is not idempotent, returns the base value to
     * persist for this transform. If a base value is returned, the transform
     * operation is always applied to this base value, even if document has
     * already been updated.
     *
     * Base values provide consistent behavior for non-idempotent transforms and
     * allow us to return the same latency-compensated value even if the backend
     * has already applied the transform operation. The base value is null for
     * idempotent transforms, as they can be re-played even if the backend has
     * already applied them.
     *
     * @return a base value to store along with the mutation, or null for
     * idempotent transforms.
     */ function je(t, e) {
        return t instanceof We ? $t(n = e) || function(t) {
            return !!t && "doubleValue" in t;
        }(n) ? e : {
            integerValue: 0
        } : null;
        var n;
    }

    /** Transforms a value into a server-generated timestamp. */ var Be = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return __extends(n, e), n;
    }(Ue), ze = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).elements = t, n;
        }
        return __extends(n, e), n;
    }(Ue);

    /** Transforms an array value via a union operation. */ function Ge(t, e) {
        for (var n = He(e), r = function(t) {
            n.some((function(e) {
                return Bt(e, t);
            })) || n.push(t);
        }, i = 0, o = t.elements; i < o.length; i++) {
            r(o[i]);
        }
        return {
            arrayValue: {
                values: n
            }
        };
    }

    /** Transforms an array value via a remove operation. */ var Ke = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).elements = t, n;
        }
        return __extends(n, e), n;
    }(Ue);

    function Qe(t, e) {
        for (var n = He(e), r = function(t) {
            n = n.filter((function(e) {
                return !Bt(e, t);
            }));
        }, i = 0, o = t.elements; i < o.length; i++) {
            r(o[i]);
        }
        return {
            arrayValue: {
                values: n
            }
        };
    }

    /**
     * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
     * transforms. Converts all field values to integers or doubles, but unlike the
     * backend does not cap integer values at 2^63. Instead, JavaScript number
     * arithmetic is used and precision loss can occur for values greater than 2^53.
     */ var We = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).serializer = t, r.Ke = n, r;
        }
        return __extends(n, e), n;
    }(Ue);

    function Ye(t) {
        return Ht(t.integerValue || t.doubleValue);
    }

    function He(t) {
        return Zt(t) && t.arrayValue.values ? t.arrayValue.values.slice() : [];
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provides a set of fields that can be used to partially patch a document.
     * FieldMask is used in conjunction with ObjectValue.
     * Examples:
     *   foo - Overwrites foo entirely with the provided value. If foo is not
     *         present in the companion ObjectValue, the field is deleted.
     *   foo.bar - Overwrites only the field bar of the object foo.
     *             If foo is not an object, foo is replaced with an object
     *             containing foo
     */ var Je = /** @class */ function() {
        function t(t) {
            this.fields = t, 
            // TODO(dimond): validation of FieldMask
            // Sort the field mask to support `FieldMask.isEqual()` and assert below.
            t.sort(W$1.V)
            /**
         * Verifies that `fieldPath` is included by at least one field in this field
         * mask.
         *
         * This is an O(n) operation, where `n` is the size of the field mask.
         */;
        }
        return t.prototype.He = function(t) {
            for (var e = 0, n = this.fields; e < n.length; e++) {
                if (n[e].N(t)) return !0;
            }
            return !1;
        }, t.prototype.isEqual = function(t) {
            return C$1(this.fields, t.fields, (function(t, e) {
                return t.isEqual(e);
            }));
        }, t;
    }(), Xe = function(t, e) {
        this.field = t, this.transform = e;
    };

    /** A field path and the TransformOperation to perform upon it. */
    /** The result of successfully applying a mutation to the backend. */ var $e = function(
    /**
         * The version at which the mutation was committed:
         *
         * - For most operations, this is the updateTime in the WriteResult.
         * - For deletes, the commitTime of the WriteResponse (because deletes are
         *   not stored and have no updateTime).
         *
         * Note that these versions can be different: No-op writes will not change
         * the updateTime even though the commitTime advances.
         */
    t, 
    /**
         * The resulting fields returned from the backend after a
         * TransformMutation has been committed. Contains one FieldValue for each
         * FieldTransform that was in the mutation.
         *
         * Will be null if the mutation was not a TransformMutation.
         */
    e) {
        this.version = t, this.transformResults = e;
    }, Ze = /** @class */ function() {
        function t(t, e) {
            this.updateTime = t, this.exists = e
            /** Creates a new empty Precondition. */;
        }
        return t.Ge = function() {
            return new t;
        }, 
        /** Creates a new Precondition with an exists flag. */ t.exists = function(e) {
            return new t(void 0, e);
        }, 
        /** Creates a new Precondition based on a version a document exists at. */ t.updateTime = function(e) {
            return new t(e);
        }, Object.defineProperty(t.prototype, "We", {
            /** Returns whether this Precondition is empty. */ get: function() {
                return void 0 === this.updateTime && void 0 === this.exists;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(t) {
            return this.exists === t.exists && (this.updateTime ? !!t.updateTime && this.updateTime.isEqual(t.updateTime) : !t.updateTime);
        }, t;
    }();

    /**
     * Encodes a precondition for a mutation. This follows the model that the
     * backend accepts with the special case of an explicit "empty" precondition
     * (meaning no precondition).
     */
    /**
     * Returns true if the preconditions is valid for the given document
     * (or null if no document is available).
     */
    function tn(t, e) {
        return void 0 !== t.updateTime ? e instanceof bn && e.version.isEqual(t.updateTime) : void 0 === t.exists || t.exists === e instanceof bn;
    }

    /**
     * A mutation describes a self-contained change to a document. Mutations can
     * create, replace, delete, and update subsets of documents.
     *
     * Mutations not only act on the value of the document but also its version.
     *
     * For local mutations (mutations that haven't been committed yet), we preserve
     * the existing version for Set, Patch, and Transform mutations. For Delete
     * mutations, we reset the version to 0.
     *
     * Here's the expected transition table.
     *
     * MUTATION           APPLIED TO            RESULTS IN
     *
     * SetMutation        Document(v3)          Document(v3)
     * SetMutation        NoDocument(v3)        Document(v0)
     * SetMutation        null                  Document(v0)
     * PatchMutation      Document(v3)          Document(v3)
     * PatchMutation      NoDocument(v3)        NoDocument(v3)
     * PatchMutation      null                  null
     * TransformMutation  Document(v3)          Document(v3)
     * TransformMutation  NoDocument(v3)        NoDocument(v3)
     * TransformMutation  null                  null
     * DeleteMutation     Document(v3)          NoDocument(v0)
     * DeleteMutation     NoDocument(v3)        NoDocument(v0)
     * DeleteMutation     null                  NoDocument(v0)
     *
     * For acknowledged mutations, we use the updateTime of the WriteResponse as
     * the resulting version for Set, Patch, and Transform mutations. As deletes
     * have no explicit update time, we use the commitTime of the WriteResponse for
     * Delete mutations.
     *
     * If a mutation is acknowledged by the backend but fails the precondition check
     * locally, we return an `UnknownDocument` and rely on Watch to send us the
     * updated version.
     *
     * Note that TransformMutations don't create Documents (in the case of being
     * applied to a NoDocument), even though they would on the backend. This is
     * because the client always combines the TransformMutation with a SetMutation
     * or PatchMutation and we only want to apply the transform if the prior
     * mutation resulted in a Document (always true for a SetMutation, but not
     * necessarily for a PatchMutation).
     *
     * ## Subclassing Notes
     *
     * Subclasses of Mutation need to implement applyToRemoteDocument() and
     * applyToLocalView() to implement the actual behavior of applying the mutation
     * to some source document.
     */ var en = function() {};

    /**
     * Applies this mutation to the given MaybeDocument or null for the purposes
     * of computing a new remote document. If the input document doesn't match the
     * expected state (e.g. it is null or outdated), an `UnknownDocument` can be
     * returned.
     *
     * @param mutation The mutation to apply.
     * @param maybeDoc The document to mutate. The input document can be null if
     *     the client has no knowledge of the pre-mutation state of the document.
     * @param mutationResult The result of applying the mutation from the backend.
     * @return The mutated document. The returned document may be an
     *     UnknownDocument if the mutation could not be applied to the locally
     *     cached base document.
     */ function nn(t, e, n) {
        return t instanceof an ? function(t, e, n) {
            // Unlike applySetMutationToLocalView, if we're applying a mutation to a
            // remote document the server has accepted the mutation so the precondition
            // must have held.
            return new bn(t.key, n.version, t.value, {
                hasCommittedMutations: !0
            });
        }(t, 0, n) : t instanceof cn ? function(t, e, n) {
            if (!tn(t.je, e)) 
            // Since the mutation was not rejected, we know that the  precondition
            // matched on the backend. We therefore must not have the expected version
            // of the document in our cache and return an UnknownDocument with the
            // known updateTime.
            return new In(t.key, n.version);
            var r = hn(t, e);
            return new bn(t.key, n.version, r, {
                hasCommittedMutations: !0
            });
        }(t, e, n) : t instanceof fn ? function(t, e, n) {
            if (k$1(null != n.transformResults), !tn(t.je, e)) 
            // Since the mutation was not rejected, we know that the  precondition
            // matched on the backend. We therefore must not have the expected version
            // of the document in our cache and return an UnknownDocument with the
            // known updateTime.
            return new In(t.key, n.version);
            var r = ln(t, e), i = 
            /**
     * Creates a list of "transform results" (a transform result is a field value
     * representing the result of applying a transform) for use after a
     * TransformMutation has been acknowledged by the server.
     *
     * @param fieldTransforms The field transforms to apply the result to.
     * @param baseDoc The document prior to applying this mutation batch.
     * @param serverTransformResults The transform results received by the server.
     * @return The transform results list.
     */
            function(t, e, n) {
                var r = [];
                k$1(t.length === n.length);
                for (var i = 0; i < n.length; i++) {
                    var o = t[i], u = o.transform, s = null;
                    e instanceof bn && (s = e.field(o.field)), r.push(Fe(u, s, n[i]));
                }
                return r;
            }(t.fieldTransforms, e, n.transformResults), o = n.version, u = pn(t, r.data(), i);
            return new bn(t.key, o, u, {
                hasCommittedMutations: !0
            });
        }(t, e, n) : function(t, e, n) {
            // Unlike applyToLocalView, if we're applying a mutation to a remote
            // document the server has accepted the mutation so the precondition must
            // have held.
            return new _n(t.key, n.version, {
                hasCommittedMutations: !0
            });
        }(t, 0, n);
    }

    /**
     * Applies this mutation to the given MaybeDocument or null for the purposes
     * of computing the new local view of a document. Both the input and returned
     * documents can be null.
     *
     * @param mutation The mutation to apply.
     * @param maybeDoc The document to mutate. The input document can be null if
     *     the client has no knowledge of the pre-mutation state of the document.
     * @param baseDoc The state of the document prior to this mutation batch. The
     *     input document can be null if the client has no knowledge of the
     *     pre-mutation state of the document.
     * @param localWriteTime A timestamp indicating the local write time of the
     *     batch this mutation is a part of.
     * @return The mutated document. The returned document may be null, but only
     *     if maybeDoc was null and the mutation would not create a new document.
     */ function rn(t, e, n, r) {
        return t instanceof an ? function(t, e) {
            if (!tn(t.je, e)) return e;
            var n = sn(e);
            return new bn(t.key, n, t.value, {
                Je: !0
            });
        }(t, e) : t instanceof cn ? function(t, e) {
            if (!tn(t.je, e)) return e;
            var n = sn(e), r = hn(t, e);
            return new bn(t.key, n, r, {
                Je: !0
            });
        }(t, e) : t instanceof fn ? function(t, e, n, r) {
            if (!tn(t.je, e)) return e;
            var i = ln(t, e), o = function(t, e, n, r) {
                for (var i = [], o = 0, u = t; o < u.length; o++) {
                    var s = u[o], a = s.transform, c = null;
                    n instanceof bn && (c = n.field(s.field)), null === c && r instanceof bn && (
                    // If the current document does not contain a value for the mutated
                    // field, use the value that existed before applying this mutation
                    // batch. This solves an edge case where a PatchMutation clears the
                    // values in a nested map before the TransformMutation is applied.
                    c = r.field(s.field)), i.push(qe(a, c, e));
                }
                return i;
            }(t.fieldTransforms, n, e, r), u = pn(t, i.data(), o);
            return new bn(t.key, i.version, u, {
                Je: !0
            });
        }(t, e, r, n) : function(t, e) {
            return tn(t.je, e) ? new _n(t.key, z.min()) : e;
        }(t, e);
    }

    /**
     * If this mutation is not idempotent, returns the base value to persist with
     * this mutation. If a base value is returned, the mutation is always applied
     * to this base value, even if document has already been updated.
     *
     * The base value is a sparse object that consists of only the document
     * fields for which this mutation contains a non-idempotent transformation
     * (e.g. a numeric increment). The provided value guarantees consistent
     * behavior for non-idempotent transforms and allow us to return the same
     * latency-compensated value even if the backend has already applied the
     * mutation. The base value is null for idempotent mutations, as they can be
     * re-played even if the backend has already applied them.
     *
     * @return a base value to store along with the mutation, or null for
     * idempotent mutations.
     */ function on(t, e) {
        return t instanceof fn ? function(t, e) {
            for (var n = null, r = 0, i = t.fieldTransforms; r < i.length; r++) {
                var o = i[r], u = e instanceof bn ? e.field(o.field) : void 0, s = je(o.transform, u || null);
                null != s && (n = null == n ? (new gn).set(o.field, s) : n.set(o.field, s));
            }
            return n ? n.Ye() : null;
        }(t, e) : null;
    }

    function un(t, e) {
        return t.type === e.type && !!t.key.isEqual(e.key) && !!t.je.isEqual(e.je) && (0 /* Set */ === t.type ? t.value.isEqual(e.value) : 1 /* Patch */ === t.type ? t.data.isEqual(e.data) && t.Qe.isEqual(e.Qe) : 2 /* Transform */ !== t.type || C$1(t.fieldTransforms, t.fieldTransforms, (function(t, e) {
            return function(t, e) {
                return t.field.isEqual(e.field) && function(t, e) {
                    return t instanceof ze && e instanceof ze || t instanceof Ke && e instanceof Ke ? C$1(t.elements, e.elements, Bt) : t instanceof We && e instanceof We ? Bt(t.Ke, e.Ke) : t instanceof Be && e instanceof Be;
                }(t.transform, e.transform);
            }(t, e);
        })));
    }

    /**
     * Returns the version from the given document for use as the result of a
     * mutation. Mutations are defined to return the version of the base document
     * only if it is an existing document. Deleted and unknown documents have a
     * post-mutation version of SnapshotVersion.min().
     */ function sn(t) {
        return t instanceof bn ? t.version : z.min();
    }

    /**
     * A mutation that creates or replaces the document at the given key with the
     * object value contents.
     */ var an = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this) || this).key = t, i.value = n, i.je = r, i.type = 0 /* Set */ , 
            i;
        }
        return __extends(n, e), n;
    }(en), cn = /** @class */ function(e) {
        function n(t, n, r, i) {
            var o = this;
            return (o = e.call(this) || this).key = t, o.data = n, o.Qe = r, o.je = i, o.type = 1 /* Patch */ , 
            o;
        }
        return __extends(n, e), n;
    }(en);

    function hn(t, e) {
        return function(t, e) {
            var n = new gn(e);
            return t.Qe.fields.forEach((function(e) {
                if (!e.T()) {
                    var r = t.data.field(e);
                    null !== r ? n.set(e, r) : n.delete(e);
                }
            })), n.Ye();
        }(t, e instanceof bn ? e.data() : yn.empty());
    }

    var fn = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).key = t, r.fieldTransforms = n, r.type = 2 /* Transform */ , 
            // NOTE: We set a precondition of exists: true as a safety-check, since we
            // always combine TransformMutations with a SetMutation or PatchMutation which
            // (if successful) should end up with an existing document.
            r.je = Ze.exists(!0), r;
        }
        return __extends(n, e), n;
    }(en);

    function ln(t, e) {
        return e;
    }

    function pn(t, e, n) {
        for (var r = new gn(e), i = 0; i < t.fieldTransforms.length; i++) {
            var o = t.fieldTransforms[i];
            r.set(o.field, n[i]);
        }
        return r.Ye();
    }

    /** A mutation that deletes the document at the given key. */ var dn = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).key = t, r.je = n, r.type = 3 /* Delete */ , r;
        }
        return __extends(n, e), n;
    }(en), vn = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).key = t, r.je = n, r.type = 4 /* Verify */ , r;
        }
        return __extends(n, e), n;
    }(en), yn = /** @class */ function() {
        function t(t) {
            this.proto = t;
        }
        return t.empty = function() {
            return new t({
                mapValue: {}
            });
        }, 
        /**
         * Returns the value at the given path or null.
         *
         * @param path the path to search
         * @return The value at the path or if there it doesn't exist.
         */
        t.prototype.field = function(t) {
            if (t.T()) return this.proto;
            for (var e = this.proto, n = 0; n < t.length - 1; ++n) {
                if (!e.mapValue.fields) return null;
                if (!ne(e = e.mapValue.fields[t.get(n)])) return null;
            }
            return (e = (e.mapValue.fields || {})[t.C()]) || null;
        }, t.prototype.isEqual = function(t) {
            return Bt(this.proto, t.proto);
        }, t;
    }(), gn = /** @class */ function() {
        /**
         * @param baseObject The object to mutate.
         */
        function t(t) {
            void 0 === t && (t = yn.empty()), this.Xe = t, 
            /** A map that contains the accumulated changes in this builder. */
            this.Ze = new Map;
        }
        /**
         * Sets the field to the provided value.
         *
         * @param path The field path to set.
         * @param value The value to set.
         * @return The current Builder instance.
         */    return t.prototype.set = function(t, e) {
            return this.tn(t, e), this;
        }, 
        /**
         * Removes the field at the specified path. If there is no field at the
         * specified path, nothing is changed.
         *
         * @param path The field path to remove.
         * @return The current Builder instance.
         */
        t.prototype.delete = function(t) {
            return this.tn(t, null), this;
        }, 
        /**
         * Adds `value` to the overlay map at `path`. Creates nested map entries if
         * needed.
         */
        t.prototype.tn = function(t, e) {
            for (var n = this.Ze, r = 0; r < t.length - 1; ++r) {
                var i = t.get(r), o = n.get(i);
                o instanceof Map ? 
                // Re-use a previously created map
                n = o : o && 10 /* ObjectValue */ === jt(o) ? (
                // Convert the existing Protobuf MapValue into a map
                o = new Map(Object.entries(o.mapValue.fields || {})), n.set(i, o), n = o) : (
                // Create an empty map to represent the current nesting level
                o = new Map, n.set(i, o), n = o);
            }
            n.set(t.C(), e);
        }, 
        /** Returns an ObjectValue with all mutations applied. */ t.prototype.Ye = function() {
            var t = this.en(W$1.$(), this.Ze);
            return null != t ? new yn(t) : this.Xe;
        }, 
        /**
         * Applies any overlays from `currentOverlays` that exist at `currentPath`
         * and returns the merged data at `currentPath` (or null if there were no
         * changes).
         *
         * @param currentPath The path at the current nesting level. Can be set to
         * FieldValue.emptyPath() to represent the root.
         * @param currentOverlays The overlays at the current nesting level in the
         * same format as `overlayMap`.
         * @return The merged data at `currentPath` or null if no modifications
         * were applied.
         */
        t.prototype.en = function(t, e) {
            var n = this, r = !1, i = this.Xe.field(t), o = ne(i) ? // If there is already data at the current path, base our
            Object.assign({}, i.mapValue.fields) : {};
            return e.forEach((function(e, i) {
                if (e instanceof Map) {
                    var u = n.en(t.child(i), e);
                    null != u && (o[i] = u, r = !0);
                } else null !== e ? (o[i] = e, r = !0) : o.hasOwnProperty(i) && (delete o[i], r = !0);
            })), r ? {
                mapValue: {
                    fields: o
                }
            } : null;
        }, t;
    }();

    /**
     * Returns a FieldMask built from all fields in a MapValue.
     */
    function mn(t) {
        var e = [];
        return M$1(t.fields || {}, (function(t, n) {
            var r = new W$1([ t ]);
            if (ne(n)) {
                var i = mn(n.mapValue).fields;
                if (0 === i.length) 
                // Preserve the empty map by adding it to the FieldMask.
                e.push(r); else 
                // For nested and non-empty ObjectValues, add the FieldPath of the
                // leaf nodes.
                for (var o = 0, u = i; o < u.length; o++) {
                    var s = u[o];
                    e.push(r.child(s));
                }
            } else 
            // For nested and non-empty ObjectValues, add the FieldPath of the leaf
            // nodes.
            e.push(r);
        })), new Je(e)
        /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
        /**
     * The result of a lookup for a given path may be an existing document or a
     * marker that this document does not exist at a given version.
     */;
    }

    var wn = function(t, e) {
        this.key = t, this.version = e;
    }, bn = /** @class */ function(e) {
        function n(t, n, r, i) {
            var o = this;
            return (o = e.call(this, t, n) || this).nn = r, o.Je = !!i.Je, o.hasCommittedMutations = !!i.hasCommittedMutations, 
            o;
        }
        return __extends(n, e), n.prototype.field = function(t) {
            return this.nn.field(t);
        }, n.prototype.data = function() {
            return this.nn;
        }, n.prototype.sn = function() {
            return this.nn.proto;
        }, n.prototype.isEqual = function(t) {
            return t instanceof n && this.key.isEqual(t.key) && this.version.isEqual(t.version) && this.Je === t.Je && this.hasCommittedMutations === t.hasCommittedMutations && this.nn.isEqual(t.nn);
        }, n.prototype.toString = function() {
            return "Document(" + this.key + ", " + this.version + ", " + this.nn.toString() + ", {hasLocalMutations: " + this.Je + "}), {hasCommittedMutations: " + this.hasCommittedMutations + "})";
        }, Object.defineProperty(n.prototype, "hasPendingWrites", {
            get: function() {
                return this.Je || this.hasCommittedMutations;
            },
            enumerable: !1,
            configurable: !0
        }), n;
    }(wn), _n = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this, t, n) || this).hasCommittedMutations = !(!r || !r.hasCommittedMutations), 
            i;
        }
        return __extends(n, e), n.prototype.toString = function() {
            return "NoDocument(" + this.key + ", " + this.version + ")";
        }, Object.defineProperty(n.prototype, "hasPendingWrites", {
            get: function() {
                return this.hasCommittedMutations;
            },
            enumerable: !1,
            configurable: !0
        }), n.prototype.isEqual = function(t) {
            return t instanceof n && t.hasCommittedMutations === this.hasCommittedMutations && t.version.isEqual(this.version) && t.key.isEqual(this.key);
        }, n;
    }(wn), In = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return __extends(n, e), n.prototype.toString = function() {
            return "UnknownDocument(" + this.key + ", " + this.version + ")";
        }, Object.defineProperty(n.prototype, "hasPendingWrites", {
            get: function() {
                return !0;
            },
            enumerable: !1,
            configurable: !0
        }), n.prototype.isEqual = function(t) {
            return t instanceof n && t.version.isEqual(this.version) && t.key.isEqual(this.key);
        }, n;
    }(wn), En = 
    /**
         * Initializes a Query with a path and optional additional query constraints.
         * Path must currently be empty if this is a collection group query.
         */
    function(t, e, n, r, i, o /* First */ , u, s) {
        void 0 === e && (e = null), void 0 === n && (n = []), void 0 === r && (r = []), 
        void 0 === i && (i = null), void 0 === o && (o = "F"), void 0 === u && (u = null), 
        void 0 === s && (s = null), this.path = t, this.collectionGroup = e, this.rn = n, 
        this.filters = r, this.limit = i, this.limitType = o, this.startAt = u, this.endAt = s, 
        this.on = null, 
        // The corresponding `Target` of this `Query` instance.
        this.an = null, this.startAt, this.endAt;
    };

    /**
     * Represents a document in Firestore with a key, version, data and whether the
     * data has local mutations applied to it.
     */
    /** Creates a new Query instance with the options provided. */ function Tn(t, e, n, r, i, o, u, s) {
        return new En(t, e, n, r, i, o, u, s);
    }

    /** Creates a new Query for a query that matches all documents at `path` */ function Nn(t) {
        return new En(t);
    }

    /**
     * Helper to convert a collection group query into a collection query at a
     * specific path. This is used when executing collection group queries, since
     * we have to split the query into a set of collection queries at multiple
     * paths.
     */ function xn(t) {
        return !H$1(t.limit) && "F" /* First */ === t.limitType;
    }

    function An(t) {
        return !H$1(t.limit) && "L" /* Last */ === t.limitType;
    }

    function Sn(t) {
        return t.rn.length > 0 ? t.rn[0].field : null;
    }

    function kn(t) {
        for (var e = 0, n = t.filters; e < n.length; e++) {
            var r = n[e];
            if (r.cn()) return r.field;
        }
        return null;
    }

    /**
     * Checks if any of the provided Operators are included in the query and
     * returns the first one that is, or null if none are.
     */
    /**
     * Returns whether the query matches a collection group rather than a specific
     * collection.
     */ function Dn(t) {
        return null !== t.collectionGroup;
    }

    /**
     * Returns the implicit order by constraint that is used to execute the Query,
     * which can be different from the order by constraints the user provided (e.g.
     * the SDK and backend always orders by `__name__`).
     */ function On(t) {
        var e = D$1(t);
        if (null === e.on) {
            e.on = [];
            var n = kn(e), r = Sn(e);
            if (null !== n && null === r) 
            // In order to implicitly add key ordering, we must also add the
            // inequality filter field for it to be a valid query.
            // Note that the default inequality field and key ordering is ascending.
            n.B() || e.on.push(new tr(n)), e.on.push(new tr(W$1.q(), "asc" /* ASCENDING */)); else {
                for (var i = !1, o = 0, u = e.rn; o < u.length; o++) {
                    var s = u[o];
                    e.on.push(s), s.field.B() && (i = !0);
                }
                if (!i) {
                    // The order of the implicit key ordering always matches the last
                    // explicit order by
                    var a = e.rn.length > 0 ? e.rn[e.rn.length - 1].dir : "asc" /* ASCENDING */;
                    e.on.push(new tr(W$1.q(), a));
                }
            }
        }
        return e.on;
    }

    /**
     * Converts this `Query` instance to it's corresponding `Target` representation.
     */ function Pn(t) {
        var e = D$1(t);
        if (!e.an) if ("F" /* First */ === e.limitType) e.an = Z$1(e.path, e.collectionGroup, On(e), e.filters, e.limit, e.startAt, e.endAt); else {
            for (
            // Flip the orderBy directions since we want the last results
            var n = [], r = 0, i = On(e); r < i.length; r++) {
                var o = i[r], u = "desc" /* DESCENDING */ === o.dir ? "asc" /* ASCENDING */ : "desc" /* DESCENDING */;
                n.push(new tr(o.field, u));
            }
            // We need to swap the cursors to match the now-flipped query ordering.
                    var s = e.endAt ? new Jn(e.endAt.position, !e.endAt.before) : null, a = e.startAt ? new Jn(e.startAt.position, !e.startAt.before) : null;
            // Now return as a LimitType.First query.
                    e.an = Z$1(e.path, e.collectionGroup, n, e.filters, e.limit, s, a);
        }
        return e.an;
    }

    function Vn(t, e, n) {
        return new En(t.path, t.collectionGroup, t.rn.slice(), t.filters.slice(), e, n, t.startAt, t.endAt);
    }

    function Cn(t, e) {
        return new En(t.path, t.collectionGroup, t.rn.slice(), t.filters.slice(), t.limit, t.limitType, e, t.endAt);
    }

    function Ln(t, e) {
        return new En(t.path, t.collectionGroup, t.rn.slice(), t.filters.slice(), t.limit, t.limitType, t.startAt, e);
    }

    function Rn(t, e) {
        return et(Pn(t), Pn(e)) && t.limitType === e.limitType;
    }

    // TODO(b/29183165): This is used to get a unique string from a query to, for
    // example, use as a dictionary key, but the implementation is subject to
    // collisions. Make it collision-free.
    function Mn(t) {
        return tt(Pn(t)) + "|lt:" + t.limitType;
    }

    function Un(t) {
        return "Query(target=" + function(t) {
            var e = t.path.M();
            return null !== t.collectionGroup && (e += " collectionGroup=" + t.collectionGroup), 
            t.filters.length > 0 && (e += ", filters: [" + t.filters.map((function(t) {
                return (e = t).field.M() + " " + e.op + " " + Qt(e.value);
                /** Returns a debug description for `filter`. */            var e;
                /** Filter that matches on key fields (i.e. '__name__'). */        })).join(", ") + "]"), 
            H$1(t.limit) || (e += ", limit: " + t.limit), t.orderBy.length > 0 && (e += ", orderBy: [" + t.orderBy.map((function(t) {
                return (e = t).field.M() + " (" + e.dir + ")";
                var e;
            })).join(", ") + "]"), t.startAt && (e += ", startAt: " + Xn(t.startAt)), t.endAt && (e += ", endAt: " + Xn(t.endAt)), 
            "Target(" + e + ")";
        }(Pn(t)) + "; limitType=" + t.limitType + ")";
    }

    /** Returns whether `doc` matches the constraints of `query`. */ function qn(t, e) {
        return function(t, e) {
            var n = e.key.path;
            return null !== t.collectionGroup ? e.key.j(t.collectionGroup) && t.path.N(n) : Y$1.G(t.path) ? t.path.isEqual(n) : t.path.F(n);
        }(t, e) && function(t, e) {
            for (var n = 0, r = t.rn; n < r.length; n++) {
                var i = r[n];
                // order by key always matches
                            if (!i.field.B() && null === e.field(i.field)) return !1;
            }
            return !0;
        }(t, e) && function(t, e) {
            for (var n = 0, r = t.filters; n < r.length; n++) {
                if (!r[n].matches(e)) return !1;
            }
            return !0;
        }(t, e) && function(t, e) {
            return !(t.startAt && !$n(t.startAt, On(t), e)) && (!t.endAt || !$n(t.endAt, On(t), e));
        }(t, e);
    }

    function Fn(t) {
        return function(e, n) {
            for (var r = !1, i = 0, o = On(t); i < o.length; i++) {
                var u = o[i], s = er(u, e, n);
                if (0 !== s) return s;
                r = r || u.field.B();
            }
            return 0;
        };
    }

    var jn = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this) || this).field = t, i.op = n, i.value = r, i;
        }
        /**
         * Creates a filter based on the provided arguments.
         */    return __extends(n, e), n.create = function(t, e, r) {
            return t.B() ? "in" /* IN */ === e || "not-in" /* NOT_IN */ === e ? this.un(t, e, r) : new Bn(t, e, r) : "array-contains" /* ARRAY_CONTAINS */ === e ? new Qn(t, r) : "in" /* IN */ === e ? new Wn(t, r) : "not-in" /* NOT_IN */ === e ? new Yn(t, r) : "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e ? new Hn(t, r) : new n(t, e, r);
        }, n.un = function(t, e, n) {
            return "in" /* IN */ === e ? new zn(t, n) : new Gn(t, n);
        }, n.prototype.matches = function(t) {
            var e = t.field(this.field);
            // Types do not have to match in NOT_EQUAL filters.
                    return "!=" /* NOT_EQUAL */ === this.op ? null !== e && this.hn(Gt(e, this.value)) : null !== e && jt(this.value) === jt(e) && this.hn(Gt(e, this.value));
            // Only compare types with matching backend order (such as double and int).
            }, n.prototype.hn = function(t) {
            switch (this.op) {
              case "<" /* LESS_THAN */ :
                return t < 0;

              case "<=" /* LESS_THAN_OR_EQUAL */ :
                return t <= 0;

              case "==" /* EQUAL */ :
                return 0 === t;

              case "!=" /* NOT_EQUAL */ :
                return 0 !== t;

              case ">" /* GREATER_THAN */ :
                return t > 0;

              case ">=" /* GREATER_THAN_OR_EQUAL */ :
                return t >= 0;

              default:
                return S$1();
            }
        }, n.prototype.cn = function() {
            return [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , ">=" /* GREATER_THAN_OR_EQUAL */ , "!=" /* NOT_EQUAL */ , "not-in" /* NOT_IN */ ].indexOf(this.op) >= 0;
        }, n;
    }((function() {}));

    var Bn = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this, t, n, r) || this).key = Y$1.W(r.referenceValue), i;
        }
        return __extends(n, e), n.prototype.matches = function(t) {
            var e = Y$1.V(t.key, this.key);
            return this.hn(e);
        }, n;
    }(jn), zn = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, t, "in" /* IN */ , n) || this).keys = Kn("in" /* IN */ , n), 
            r;
        }
        return __extends(n, e), n.prototype.matches = function(t) {
            return this.keys.some((function(e) {
                return e.isEqual(t.key);
            }));
        }, n;
    }(jn), Gn = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, t, "not-in" /* NOT_IN */ , n) || this).keys = Kn("not-in" /* NOT_IN */ , n), 
            r;
        }
        return __extends(n, e), n.prototype.matches = function(t) {
            return !this.keys.some((function(e) {
                return e.isEqual(t.key);
            }));
        }, n;
    }(jn);

    /** Filter that matches on key fields within an array. */ function Kn(t, e) {
        var n;
        return ((null === (n = e.arrayValue) || void 0 === n ? void 0 : n.values) || []).map((function(t) {
            return Y$1.W(t.referenceValue);
        }));
    }

    /** A Filter that implements the array-contains operator. */ var Qn = /** @class */ function(e) {
        function n(t, n) {
            return e.call(this, t, "array-contains" /* ARRAY_CONTAINS */ , n) || this;
        }
        return __extends(n, e), n.prototype.matches = function(t) {
            var e = t.field(this.field);
            return Zt(e) && zt(e.arrayValue, this.value);
        }, n;
    }(jn), Wn = /** @class */ function(e) {
        function n(t, n) {
            return e.call(this, t, "in" /* IN */ , n) || this;
        }
        return __extends(n, e), n.prototype.matches = function(t) {
            var e = t.field(this.field);
            return null !== e && zt(this.value.arrayValue, e);
        }, n;
    }(jn), Yn = /** @class */ function(e) {
        function n(t, n) {
            return e.call(this, t, "not-in" /* NOT_IN */ , n) || this;
        }
        return __extends(n, e), n.prototype.matches = function(t) {
            if (zt(this.value.arrayValue, {
                nullValue: "NULL_VALUE"
            })) return !1;
            var e = t.field(this.field);
            return null !== e && !zt(this.value.arrayValue, e);
        }, n;
    }(jn), Hn = /** @class */ function(e) {
        function n(t, n) {
            return e.call(this, t, "array-contains-any" /* ARRAY_CONTAINS_ANY */ , n) || this;
        }
        return __extends(n, e), n.prototype.matches = function(t) {
            var e = this, n = t.field(this.field);
            return !(!Zt(n) || !n.arrayValue.values) && n.arrayValue.values.some((function(t) {
                return zt(e.value.arrayValue, t);
            }));
        }, n;
    }(jn), Jn = function(t, e) {
        this.position = t, this.before = e;
    };

    /** A Filter that implements the IN operator. */ function Xn(t) {
        // TODO(b/29183165): Make this collision robust.
        return (t.before ? "b" : "a") + ":" + t.position.map((function(t) {
            return Qt(t);
        })).join(",");
    }

    /**
     * Returns true if a document sorts before a bound using the provided sort
     * order.
     */ function $n(t, e, n) {
        for (var r = 0, i = 0; i < t.position.length; i++) {
            var o = e[i], u = t.position[i];
            if (r = o.field.B() ? Y$1.V(Y$1.W(u.referenceValue), n.key) : Gt(u, n.field(o.field)), 
            "desc" /* DESCENDING */ === o.dir && (r *= -1), 0 !== r) break;
        }
        return t.before ? r <= 0 : r < 0;
    }

    function Zn(t, e) {
        if (null === t) return null === e;
        if (null === e) return !1;
        if (t.before !== e.before || t.position.length !== e.position.length) return !1;
        for (var n = 0; n < t.position.length; n++) if (!Bt(t.position[n], e.position[n])) return !1;
        return !0;
    }

    /**
     * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
     */ var tr = function(t, e /* ASCENDING */) {
        void 0 === e && (e = "asc"), this.field = t, this.dir = e;
    };

    function er(t, e, n) {
        var r = t.field.B() ? Y$1.V(e.key, n.key) : function(t, e, n) {
            var r = e.field(t), i = n.field(t);
            return null !== r && null !== i ? Gt(r, i) : S$1();
        }(t.field, e, n);
        switch (t.dir) {
          case "asc" /* ASCENDING */ :
            return r;

          case "desc" /* DESCENDING */ :
            return -1 * r;

          default:
            return S$1();
        }
    }

    function nr(t, e) {
        return t.dir === e.dir && t.field.isEqual(e.field);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var rr = function() {
        var t = this;
        this.promise = new Promise((function(e, n) {
            t.resolve = e, t.reject = n;
        }));
    }, ir = /** @class */ function() {
        function t(
        /**
         * The AsyncQueue to run backoff operations on.
         */
        t, 
        /**
         * The ID to use when scheduling backoff operations on the AsyncQueue.
         */
        e, 
        /**
         * The initial delay (used as the base delay on the first retry attempt).
         * Note that jitter will still be applied, so the actual delay could be as
         * little as 0.5*initialDelayMs.
         */
        n
        /**
         * The multiplier to use to determine the extended base delay after each
         * attempt.
         */ , r
        /**
         * The maximum base delay after which no further backoff is performed.
         * Note that jitter will still be applied, so the actual delay could be as
         * much as 1.5*maxDelayMs.
         */ , i) {
            void 0 === n && (n = 1e3), void 0 === r && (r = 1.5), void 0 === i && (i = 6e4), 
            this.ln = t, this._n = e, this.fn = n, this.dn = r, this.wn = i, this.Tn = 0, this.En = null, 
            /** The last backoff attempt, as epoch milliseconds. */
            this.In = Date.now(), this.reset();
        }
        /**
         * Resets the backoff delay.
         *
         * The very next backoffAndWait() will have no delay. If it is called again
         * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
         * subsequent ones will increase according to the backoffFactor.
         */    return t.prototype.reset = function() {
            this.Tn = 0;
        }, 
        /**
         * Resets the backoff delay to the maximum delay (e.g. for use after a
         * RESOURCE_EXHAUSTED error).
         */
        t.prototype.mn = function() {
            this.Tn = this.wn;
        }, 
        /**
         * Returns a promise that resolves after currentDelayMs, and increases the
         * delay for any subsequent attempts. If there was a pending backoff operation
         * already, it will be canceled.
         */
        t.prototype.An = function(t) {
            var e = this;
            // Cancel any pending backoff operation.
                    this.cancel();
            // First schedule using the current base (which may be 0 and should be
            // honored as such).
            var n = Math.floor(this.Tn + this.Rn()), r = Math.max(0, Date.now() - this.In), i = Math.max(0, n - r);
            // Guard against lastAttemptTime being in the future due to a clock change.
                    i > 0 && T$1("ExponentialBackoff", "Backing off for " + i + " ms (base delay: " + this.Tn + " ms, delay with jitter: " + n + " ms, last attempt: " + r + " ms ago)"), 
            this.En = this.ln.Pn(this._n, i, (function() {
                return e.In = Date.now(), t();
            })), 
            // Apply backoff factor to determine next delay and ensure it is within
            // bounds.
            this.Tn *= this.dn, this.Tn < this.fn && (this.Tn = this.fn), this.Tn > this.wn && (this.Tn = this.wn);
        }, t.prototype.gn = function() {
            null !== this.En && (this.En.Vn(), this.En = null);
        }, t.prototype.cancel = function() {
            null !== this.En && (this.En.cancel(), this.En = null);
        }, 
        /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */ t.prototype.Rn = function() {
            return (Math.random() - .5) * this.Tn;
        }, t;
    }(), or = /** @class */ function() {
        function t(t) {
            var e = this;
            // NOTE: next/catchCallback will always point to our own wrapper functions,
            // not the user's raw next() or catch() callbacks.
                    this.yn = null, this.pn = null, 
            // When the operation resolves, we'll set result or error and mark isDone.
            this.result = void 0, this.error = void 0, this.vn = !1, 
            // Set to true when .then() or .catch() are called and prevents additional
            // chaining.
            this.bn = !1, t((function(t) {
                e.vn = !0, e.result = t, e.yn && 
                // value should be defined unless T is Void, but we can't express
                // that in the type system.
                e.yn(t);
            }), (function(t) {
                e.vn = !0, e.error = t, e.pn && e.pn(t);
            }));
        }
        return t.prototype.catch = function(t) {
            return this.next(void 0, t);
        }, t.prototype.next = function(e, n) {
            var r = this;
            return this.bn && S$1(), this.bn = !0, this.vn ? this.error ? this.Sn(n, this.error) : this.Dn(e, this.result) : new t((function(t, i) {
                r.yn = function(n) {
                    r.Dn(e, n).next(t, i);
                }, r.pn = function(e) {
                    r.Sn(n, e).next(t, i);
                };
            }));
        }, t.prototype.Cn = function() {
            var t = this;
            return new Promise((function(e, n) {
                t.next(e, n);
            }));
        }, t.prototype.Nn = function(e) {
            try {
                var n = e();
                return n instanceof t ? n : t.resolve(n);
            } catch (e) {
                return t.reject(e);
            }
        }, t.prototype.Dn = function(e, n) {
            return e ? this.Nn((function() {
                return e(n);
            })) : t.resolve(n);
        }, t.prototype.Sn = function(e, n) {
            return e ? this.Nn((function() {
                return e(n);
            })) : t.reject(n);
        }, t.resolve = function(e) {
            return new t((function(t, n) {
                t(e);
            }));
        }, t.reject = function(e) {
            return new t((function(t, n) {
                n(e);
            }));
        }, t.xn = function(
        // Accept all Promise types in waitFor().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        e) {
            return new t((function(t, n) {
                var r = 0, i = 0, o = !1;
                e.forEach((function(e) {
                    ++r, e.next((function() {
                        ++i, o && i === r && t();
                    }), (function(t) {
                        return n(t);
                    }));
                })), o = !0, i === r && t();
            }));
        }, 
        /**
         * Given an array of predicate functions that asynchronously evaluate to a
         * boolean, implements a short-circuiting `or` between the results. Predicates
         * will be evaluated until one of them returns `true`, then stop. The final
         * result will be whether any of them returned `true`.
         */
        t.Fn = function(e) {
            for (var n = t.resolve(!1), r = function(e) {
                n = n.next((function(n) {
                    return n ? t.resolve(n) : e();
                }));
            }, i = 0, o = e; i < o.length; i++) {
                r(o[i]);
            }
            return n;
        }, t.forEach = function(t, e) {
            var n = this, r = [];
            return t.forEach((function(t, i) {
                r.push(e.call(n, t, i));
            })), this.xn(r);
        }, t;
    }(), ur = /** @class */ function() {
        /*
         * Creates a new SimpleDb wrapper for IndexedDb database `name`.
         *
         * Note that `version` must not be a downgrade. IndexedDB does not support
         * downgrading the schema version. We currently do not support any way to do
         * versioning outside of IndexedDB's versioning mechanism, as only
         * version-upgrade transactions are allowed to do things like create
         * objectstores.
         */
        function t(e, n, r) {
            this.name = e, this.version = n, this.On = r, 
            // NOTE: According to https://bugs.webkit.org/show_bug.cgi?id=197050, the
            // bug we're checking for should exist in iOS >= 12.2 and < 13, but for
            // whatever reason it's much harder to hit after 12.2 so we only proactively
            // log on 12.2.
            12.2 === t.Mn(getUA()) && N$1("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");
        }
        /** Deletes the specified database. */    return t.delete = function(t) {
            return T$1("SimpleDb", "Removing database:", t), lr(window.indexedDB.deleteDatabase(t)).Cn();
        }, 
        /** Returns true if IndexedDB is available in the current environment. */ t.kn = function() {
            if ("undefined" == typeof indexedDB) return !1;
            if (t.$n()) return !0;
            // We extensively use indexed array values and compound keys,
            // which IE and Edge do not support. However, they still have indexedDB
            // defined on the window, so we need to check for them here and make sure
            // to return that persistence is not enabled for those browsers.
            // For tracking support of this feature, see here:
            // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
            // Check the UA string to find out the browser.
                    var e = getUA(), n = t.Mn(e), r = 0 < n && n < 10, i = t.Ln(e), o = 0 < i && i < 4.5;
            // IE 10
            // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';
            // IE 11
            // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
            // Edge
            // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML,
            // like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';
            // iOS Safari: Disable for users running iOS version < 10.
                    return !(e.indexOf("MSIE ") > 0 || e.indexOf("Trident/") > 0 || e.indexOf("Edge/") > 0 || r || o);
        }, 
        /**
         * Returns true if the backing IndexedDB store is the Node IndexedDBShim
         * (see https://github.com/axemclion/IndexedDBShim).
         */
        t.$n = function() {
            var t;
            return "undefined" != typeof process && "YES" === (null === (t = process.env) || void 0 === t ? void 0 : t.Bn);
        }, 
        /** Helper to get a typed SimpleDbStore from a transaction. */ t.qn = function(t, e) {
            return t.store(e);
        }, 
        // visible for testing
        /** Parse User Agent to determine iOS version. Returns -1 if not found. */
        t.Mn = function(t) {
            var e = t.match(/i(?:phone|pad|pod) os ([\d_]+)/i), n = e ? e[1].split("_").slice(0, 2).join(".") : "-1";
            return Number(n);
        }, 
        // visible for testing
        /** Parse User Agent to determine Android version. Returns -1 if not found. */
        t.Ln = function(t) {
            var e = t.match(/Android ([\d.]+)/i), n = e ? e[1].split(".").slice(0, 2).join(".") : "-1";
            return Number(n);
        }, 
        /**
         * Opens the specified database, creating or upgrading it if necessary.
         */
        t.prototype.Un = function(t) {
            return __awaiter(this, void 0, void 0, (function() {
                var e, r = this;
                return __generator(this, (function(n) {
                    switch (n.label) {
                      case 0:
                        return this.db ? [ 3 /*break*/ , 2 ] : (T$1("SimpleDb", "Opening database:", this.name), 
                        e = this, [ 4 /*yield*/ , new Promise((function(e, n) {
                            // TODO(mikelehen): Investigate browser compatibility.
                            // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
                            // suggests IE9 and older WebKit browsers handle upgrade
                            // differently. They expect setVersion, as described here:
                            // https://developer.mozilla.org/en-US/docs/Web/API/IDBVersionChangeRequest/setVersion
                            var i = indexedDB.open(r.name, r.version);
                            i.onsuccess = function(t) {
                                var n = t.target.result;
                                e(n);
                            }, i.onblocked = function() {
                                n(new ar(t, "Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."));
                            }, i.onerror = function(e) {
                                var r = e.target.error;
                                "VersionError" === r.name ? n(new j(F$1.FAILED_PRECONDITION, "A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")) : n(new ar(t, r));
                            }, i.onupgradeneeded = function(t) {
                                T$1("SimpleDb", 'Database "' + r.name + '" requires upgrade from version:', t.oldVersion);
                                var e = t.target.result;
                                r.On.createOrUpgrade(e, i.transaction, t.oldVersion, r.version).next((function() {
                                    T$1("SimpleDb", "Database upgrade to version " + r.version + " complete");
                                }));
                            };
                        })) ]);

                      case 1:
                        e.db = n.sent(), n.label = 2;

                      case 2:
                        return [ 2 /*return*/ , (this.Qn && (this.db.onversionchange = function(t) {
                            return r.Qn(t);
                        }), this.db) ];
                    }
                }));
            }));
        }, t.prototype.Kn = function(t) {
            this.Qn = t, this.db && (this.db.onversionchange = function(e) {
                return t(e);
            });
        }, t.prototype.runTransaction = function(t, r, i, o) {
            return __awaiter(this, void 0, void 0, (function() {
                var e, u, s, a, c;
                return __generator(this, (function(h) {
                    switch (h.label) {
                      case 0:
                        e = "readonly" === r, u = 0, s = function() {
                            var r, s, c, h, f;
                            return __generator(this, (function(n) {
                                switch (n.label) {
                                  case 0:
                                    ++u, n.label = 1;

                                  case 1:
                                    return n.trys.push([ 1, 4, , 5 ]), [ 4 /*yield*/ , a.Un(t) ];

                                  case 2:
                                    // Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
                                    // fire), but still return the original transactionFnResult back to the
                                    // caller.
                                    return a.db = n.sent(), r = hr.open(a.db, t, e ? "readonly" : "readwrite", i), s = o(r).catch((function(t) {
                                        // Abort the transaction if there was an error.
                                        return r.abort(t), or.reject(t);
                                    })).Cn(), c = {}, s.catch((function() {})), [ 4 /*yield*/ , r.Wn ];

                                  case 3:
                                    return [ 2 /*return*/ , (c.value = (
                                    // Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
                                    // fire), but still return the original transactionFnResult back to the
                                    // caller.
                                    n.sent(), s), c) ];

                                  case 4:
                                    return h = n.sent(), f = "FirebaseError" !== h.name && u < 3, T$1("SimpleDb", "Transaction failed with error:", h.message, "Retrying:", f), 
                                    a.close(), f ? [ 3 /*break*/ , 5 ] : [ 2 /*return*/ , {
                                        value: Promise.reject(h)
                                    } ];

                                  case 5:
                                    return [ 2 /*return*/ ];
                                }
                            }));
                        }, a = this, h.label = 1;

                      case 1:
                        return [ 5 /*yield**/ , s() ];

                      case 2:
                        if ("object" == typeof (c = h.sent())) return [ 2 /*return*/ , c.value ];
                        h.label = 3;

                      case 3:
                        return [ 3 /*break*/ , 1 ];

                      case 4:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, t.prototype.close = function() {
            this.db && this.db.close(), this.db = void 0;
        }, t;
    }(), sr = /** @class */ function() {
        function t(t) {
            this.jn = t, this.Gn = !1, this.zn = null;
        }
        return Object.defineProperty(t.prototype, "vn", {
            get: function() {
                return this.Gn;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "Hn", {
            get: function() {
                return this.zn;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "cursor", {
            set: function(t) {
                this.jn = t;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * This function can be called to stop iteration at any point.
         */
        t.prototype.done = function() {
            this.Gn = !0;
        }, 
        /**
         * This function can be called to skip to that next key, which could be
         * an index or a primary key.
         */
        t.prototype.Jn = function(t) {
            this.zn = t;
        }, 
        /**
         * Delete the current cursor value from the object store.
         *
         * NOTE: You CANNOT do this with a keysOnly query.
         */
        t.prototype.delete = function() {
            return lr(this.jn.delete());
        }, t;
    }(), ar = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, F$1.UNAVAILABLE, "IndexedDB transaction '" + t + "' failed: " + n) || this).name = "IndexedDbTransactionError", 
            r;
        }
        return __extends(n, e), n;
    }(j);

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A helper for running delayed tasks following an exponential backoff curve
     * between attempts.
     *
     * Each delay is made up of a "base" delay which follows the exponential
     * backoff curve, and a +/- 50% "jitter" that is calculated and added to the
     * base delay. This prevents clients from accidentally synchronizing their
     * delays causing spikes of load to the backend.
     */
    /** Verifies whether `e` is an IndexedDbTransactionError. */ function cr(t) {
        // Use name equality, as instanceof checks on errors don't work with errors
        // that wrap other errors.
        return "IndexedDbTransactionError" === t.name;
    }

    /**
     * Wraps an IDBTransaction and exposes a store() method to get a handle to a
     * specific object store.
     */ var hr = /** @class */ function() {
        function t(t, e) {
            var n = this;
            this.action = t, this.transaction = e, this.aborted = !1, 
            /**
                 * A promise that resolves with the result of the IndexedDb transaction.
                 */
            this.Yn = new rr, this.transaction.oncomplete = function() {
                n.Yn.resolve();
            }, this.transaction.onabort = function() {
                e.error ? n.Yn.reject(new ar(t, e.error)) : n.Yn.resolve();
            }, this.transaction.onerror = function(e) {
                var r = dr(e.target.error);
                n.Yn.reject(new ar(t, r));
            };
        }
        return t.open = function(e, n, r, i) {
            try {
                return new t(n, e.transaction(i, r));
            } catch (e) {
                throw new ar(n, e);
            }
        }, Object.defineProperty(t.prototype, "Wn", {
            get: function() {
                return this.Yn.promise;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.abort = function(t) {
            t && this.Yn.reject(t), this.aborted || (T$1("SimpleDb", "Aborting transaction:", t ? t.message : "Client-initiated abort"), 
            this.aborted = !0, this.transaction.abort());
        }, 
        /**
         * Returns a SimpleDbStore<KeyType, ValueType> for the specified store. All
         * operations performed on the SimpleDbStore happen within the context of this
         * transaction and it cannot be used anymore once the transaction is
         * completed.
         *
         * Note that we can't actually enforce that the KeyType and ValueType are
         * correct, but they allow type safety through the rest of the consuming code.
         */
        t.prototype.store = function(t) {
            var e = this.transaction.objectStore(t);
            return new fr(e);
        }, t;
    }(), fr = /** @class */ function() {
        function t(t) {
            this.store = t;
        }
        return t.prototype.put = function(t, e) {
            var n;
            return void 0 !== e ? (T$1("SimpleDb", "PUT", this.store.name, t, e), n = this.store.put(e, t)) : (T$1("SimpleDb", "PUT", this.store.name, "<auto-key>", t), 
            n = this.store.put(t)), lr(n);
        }, 
        /**
         * Adds a new value into an Object Store and returns the new key. Similar to
         * IndexedDb's `add()`, this method will fail on primary key collisions.
         *
         * @param value The object to write.
         * @return The key of the value to add.
         */
        t.prototype.add = function(t) {
            return T$1("SimpleDb", "ADD", this.store.name, t, t), lr(this.store.add(t));
        }, 
        /**
         * Gets the object with the specified key from the specified store, or null
         * if no object exists with the specified key.
         *
         * @key The key of the object to get.
         * @return The object with the specified key or null if no object exists.
         */
        t.prototype.get = function(t) {
            var e = this;
            // We're doing an unsafe cast to ValueType.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return lr(this.store.get(t)).next((function(n) {
                // Normalize nonexistence to null.
                return void 0 === n && (n = null), T$1("SimpleDb", "GET", e.store.name, t, n), n;
            }));
        }, t.prototype.delete = function(t) {
            return T$1("SimpleDb", "DELETE", this.store.name, t), lr(this.store.delete(t));
        }, 
        /**
         * If we ever need more of the count variants, we can add overloads. For now,
         * all we need is to count everything in a store.
         *
         * Returns the number of rows in the store.
         */
        t.prototype.count = function() {
            return T$1("SimpleDb", "COUNT", this.store.name), lr(this.store.count());
        }, t.prototype.Xn = function(t, e) {
            var n = this.cursor(this.options(t, e)), r = [];
            return this.Zn(n, (function(t, e) {
                r.push(e);
            })).next((function() {
                return r;
            }));
        }, t.prototype.ts = function(t, e) {
            T$1("SimpleDb", "DELETE ALL", this.store.name);
            var n = this.options(t, e);
            n.es = !1;
            var r = this.cursor(n);
            return this.Zn(r, (function(t, e, n) {
                return n.delete();
            }));
        }, t.prototype.ns = function(t, e) {
            var n;
            e ? n = t : (n = {}, e = t);
            var r = this.cursor(n);
            return this.Zn(r, e);
        }, 
        /**
         * Iterates over a store, but waits for the given callback to complete for
         * each entry before iterating the next entry. This allows the callback to do
         * asynchronous work to determine if this iteration should continue.
         *
         * The provided callback should return `true` to continue iteration, and
         * `false` otherwise.
         */
        t.prototype.ss = function(t) {
            var e = this.cursor({});
            return new or((function(n, r) {
                e.onerror = function(t) {
                    var e = dr(t.target.error);
                    r(e);
                }, e.onsuccess = function(e) {
                    var r = e.target.result;
                    r ? t(r.primaryKey, r.value).next((function(t) {
                        t ? r.continue() : n();
                    })) : n();
                };
            }));
        }, t.prototype.Zn = function(t, e) {
            var n = [];
            return new or((function(r, i) {
                t.onerror = function(t) {
                    i(t.target.error);
                }, t.onsuccess = function(t) {
                    var i = t.target.result;
                    if (i) {
                        var o = new sr(i), u = e(i.primaryKey, i.value, o);
                        if (u instanceof or) {
                            var s = u.catch((function(t) {
                                return o.done(), or.reject(t);
                            }));
                            n.push(s);
                        }
                        o.vn ? r() : null === o.Hn ? i.continue() : i.continue(o.Hn);
                    } else r();
                };
            })).next((function() {
                return or.xn(n);
            }));
        }, t.prototype.options = function(t, e) {
            var n = void 0;
            return void 0 !== t && ("string" == typeof t ? n = t : e = t), {
                index: n,
                range: e
            };
        }, t.prototype.cursor = function(t) {
            var e = "next";
            if (t.reverse && (e = "prev"), t.index) {
                var n = this.store.index(t.index);
                return t.es ? n.openKeyCursor(t.range, e) : n.openCursor(t.range, e);
            }
            return this.store.openCursor(t.range, e);
        }, t;
    }();

    /**
     * A wrapper around an IDBObjectStore providing an API that:
     *
     * 1) Has generic KeyType / ValueType parameters to provide strongly-typed
     * methods for acting against the object store.
     * 2) Deals with IndexedDB's onsuccess / onerror event callbacks, making every
     * method return a PersistencePromise instead.
     * 3) Provides a higher-level API to avoid needing to do excessive wrapping of
     * intermediate IndexedDB types (IDBCursorWithValue, etc.)
     */
    /**
     * Wraps an IDBRequest in a PersistencePromise, using the onsuccess / onerror
     * handlers to resolve / reject the PersistencePromise as appropriate.
     */
    function lr(t) {
        return new or((function(e, n) {
            t.onsuccess = function(t) {
                var n = t.target.result;
                e(n);
            }, t.onerror = function(t) {
                var e = dr(t.target.error);
                n(e);
            };
        }));
    }

    // Guard so we only report the error once.
    var pr = !1;

    function dr(t) {
        var e = ur.Mn(getUA());
        if (e >= 12.2 && e < 13) {
            var n = "An internal error was encountered in the Indexed Database server";
            if (t.message.indexOf(n) >= 0) {
                // Wrap error in a more descriptive one.
                var r = new j("internal", "IOS_INDEXEDDB_BUG1: IndexedDb has thrown '" + n + "'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");
                return pr || (pr = !0, 
                // Throw a global exception outside of this promise chain, for the user to
                // potentially catch.
                setTimeout((function() {
                    throw r;
                }), 0)), r;
            }
        }
        return t;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** The Platform's 'window' implementation or null if not available. */ function vr() {
        // `window` is not always available, e.g. in ReactNative and WebWorkers.
        // eslint-disable-next-line no-restricted-globals
        return "undefined" != typeof window ? window : null;
    }

    /** The Platform's 'document' implementation or null if not available. */ function yr() {
        // `document` is not always available, e.g. in ReactNative and WebWorkers.
        // eslint-disable-next-line no-restricted-globals
        return "undefined" != typeof document ? document : null;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents an operation scheduled to be run in the future on an AsyncQueue.
     *
     * It is created via DelayedOperation.createAndSchedule().
     *
     * Supports cancellation (via cancel()) and early execution (via skipDelay()).
     *
     * Note: We implement `PromiseLike` instead of `Promise`, as the `Promise` type
     * in newer versions of TypeScript defines `finally`, which is not available in
     * IE.
     */ var gr = /** @class */ function() {
        function t(t, e, n, r, i) {
            this.rs = t, this._n = e, this.os = n, this.op = r, this.cs = i, this.us = new rr, 
            this.then = this.us.promise.then.bind(this.us.promise), 
            // It's normal for the deferred promise to be canceled (due to cancellation)
            // and so we attach a dummy catch callback to avoid
            // 'UnhandledPromiseRejectionWarning' log spam.
            this.us.promise.catch((function(t) {}))
            /**
         * Creates and returns a DelayedOperation that has been scheduled to be
         * executed on the provided asyncQueue after the provided delayMs.
         *
         * @param asyncQueue The queue to schedule the operation on.
         * @param id A Timer ID identifying the type of operation this is.
         * @param delayMs The delay (ms) before the operation should be scheduled.
         * @param op The operation to run.
         * @param removalCallback A callback to be called synchronously once the
         *   operation is executed or canceled, notifying the AsyncQueue to remove it
         *   from its delayedOperations list.
         *   PORTING NOTE: This exists to prevent making removeDelayedOperation() and
         *   the DelayedOperation class public.
         */;
        }
        return t.hs = function(e, n, r, i, o) {
            var u = new t(e, n, Date.now() + r, i, o);
            return u.start(r), u;
        }, 
        /**
         * Starts the timer. This is called immediately after construction by
         * createAndSchedule().
         */
        t.prototype.start = function(t) {
            var e = this;
            this.ls = setTimeout((function() {
                return e._s();
            }), t);
        }, 
        /**
         * Queues the operation to run immediately (if it hasn't already been run or
         * canceled).
         */
        t.prototype.Vn = function() {
            return this._s();
        }, 
        /**
         * Cancels the operation if it hasn't already been executed or canceled. The
         * promise will be rejected.
         *
         * As long as the operation has not yet been run, calling cancel() provides a
         * guarantee that the operation will not be run.
         */
        t.prototype.cancel = function(t) {
            null !== this.ls && (this.clearTimeout(), this.us.reject(new j(F$1.CANCELLED, "Operation cancelled" + (t ? ": " + t : ""))));
        }, t.prototype._s = function() {
            var t = this;
            this.rs.fs((function() {
                return null !== t.ls ? (t.clearTimeout(), t.op().then((function(e) {
                    return t.us.resolve(e);
                }))) : Promise.resolve();
            }));
        }, t.prototype.clearTimeout = function() {
            null !== this.ls && (this.cs(this), clearTimeout(this.ls), this.ls = null);
        }, t;
    }(), mr = /** @class */ function() {
        function t() {
            var t = this;
            // The last promise in the queue.
                    this.ds = Promise.resolve(), 
            // A list of retryable operations. Retryable operations are run in order and
            // retried with backoff.
            this.ws = [], 
            // Is this AsyncQueue being shut down? Once it is set to true, it will not
            // be changed again.
            this.Ts = !1, 
            // Operations scheduled to be queued in the future. Operations are
            // automatically removed after they are run or canceled.
            this.Es = [], 
            // visible for testing
            this.Is = null, 
            // Flag set while there's an outstanding AsyncQueue operation, used for
            // assertion sanity-checks.
            this.As = !1, 
            // List of TimerIds to fast-forward delays for.
            this.Rs = [], 
            // Backoff timer used to schedule retries for retryable operations
            this.Ps = new ir(this, "async_queue_retry" /* AsyncQueueRetry */), 
            // Visibility handler that triggers an immediate retry of all retryable
            // operations. Meant to speed up recovery when we regain file system access
            // after page comes into foreground.
            this.gs = function() {
                var e = yr();
                e && T$1("AsyncQueue", "Visibility state changed to " + e.visibilityState), t.Ps.gn();
            };
            var e = yr();
            e && "function" == typeof e.addEventListener && e.addEventListener("visibilitychange", this.gs);
        }
        return Object.defineProperty(t.prototype, "Vs", {
            // Is this AsyncQueue being shut down? If true, this instance will not enqueue
            // any new operations, Promises from enqueue requests will not resolve.
            get: function() {
                return this.Ts;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Adds a new operation to the queue without waiting for it to complete (i.e.
         * we ignore the Promise result).
         */
        t.prototype.fs = function(t) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.enqueue(t);
        }, 
        /**
         * Regardless if the queue has initialized shutdown, adds a new operation to the
         * queue without waiting for it to complete (i.e. we ignore the Promise result).
         */
        t.prototype.ys = function(t) {
            this.ps(), 
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.vs(t);
        }, 
        /**
         * Initialize the shutdown of this queue. Once this method is called, the
         * only possible way to request running an operation is through
         * `enqueueEvenWhileRestricted()`.
         */
        t.prototype.bs = function() {
            if (!this.Ts) {
                this.Ts = !0;
                var t = yr();
                t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.gs);
            }
        }, 
        /**
         * Adds a new operation to the queue. Returns a promise that will be resolved
         * when the promise returned by the new operation is (with its value).
         */
        t.prototype.enqueue = function(t) {
            return this.ps(), this.Ts ? new Promise((function(t) {})) : this.vs(t);
        }, 
        /**
         * Enqueue a retryable operation.
         *
         * A retryable operation is rescheduled with backoff if it fails with a
         * IndexedDbTransactionError (the error type used by SimpleDb). All
         * retryable operations are executed in order and only run if all prior
         * operations were retried successfully.
         */
        t.prototype.Ss = function(t) {
            var e = this;
            this.fs((function() {
                return e.ws.push(t), e.Ds();
            }));
        }, 
        /**
         * Runs the next operation from the retryable queue. If the operation fails,
         * reschedules with backoff.
         */
        t.prototype.Ds = function() {
            return __awaiter(this, void 0, void 0, (function() {
                var t, e = this;
                return __generator(this, (function(n) {
                    switch (n.label) {
                      case 0:
                        if (0 === this.ws.length) return [ 3 /*break*/ , 5 ];
                        n.label = 1;

                      case 1:
                        return n.trys.push([ 1, 3, , 4 ]), [ 4 /*yield*/ , this.ws[0]() ];

                      case 2:
                        return n.sent(), this.ws.shift(), this.Ps.reset(), [ 3 /*break*/ , 4 ];

                      case 3:
                        if (!cr(t = n.sent())) throw t;
                        // Failure will be handled by AsyncQueue
                                            return T$1("AsyncQueue", "Operation failed with retryable error: " + t), 
                        [ 3 /*break*/ , 4 ];

                      case 4:
                        this.ws.length > 0 && 
                        // If there are additional operations, we re-schedule `retryNextOp()`.
                        // This is necessary to run retryable operations that failed during
                        // their initial attempt since we don't know whether they are already
                        // enqueued. If, for example, `op1`, `op2`, `op3` are enqueued and `op1`
                        // needs to  be re-run, we will run `op1`, `op1`, `op2` using the
                        // already enqueued calls to `retryNextOp()`. `op3()` will then run in the
                        // call scheduled here.
                        // Since `backoffAndRun()` cancels an existing backoff and schedules a
                        // new backoff on every call, there is only ever a single additional
                        // operation in the queue.
                        this.Ps.An((function() {
                            return e.Ds();
                        })), n.label = 5;

                      case 5:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, t.prototype.vs = function(t) {
            var e = this, n = this.ds.then((function() {
                return e.As = !0, t().catch((function(t) {
                    // Re-throw the error so that this.tail becomes a rejected Promise and
                    // all further attempts to chain (via .then) will just short-circuit
                    // and return the rejected Promise.
                    throw e.Is = t, e.As = !1, N$1("INTERNAL UNHANDLED ERROR: ", 
                    /**
     * Chrome includes Error.message in Error.stack. Other browsers do not.
     * This returns expected output of message + stack when available.
     * @param error Error or FirestoreError
     */
                    function(t) {
                        var e = t.message || "";
                        return t.stack && (e = t.stack.includes(t.message) ? t.stack : t.message + "\n" + t.stack), 
                        e;
                    }(t)), t;
                })).then((function(t) {
                    return e.As = !1, t;
                }));
            }));
            return this.ds = n, n;
        }, 
        /**
         * Schedules an operation to be queued on the AsyncQueue once the specified
         * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
         * or fast-forward the operation prior to its running.
         */
        t.prototype.Pn = function(t, e, n) {
            var r = this;
            this.ps(), 
            // Fast-forward delays for timerIds that have been overriden.
            this.Rs.indexOf(t) > -1 && (e = 0);
            var i = gr.hs(this, t, e, n, (function(t) {
                return r.Cs(t);
            }));
            return this.Es.push(i), i;
        }, t.prototype.ps = function() {
            this.Is && S$1();
        }, 
        /**
         * Verifies there's an operation currently in-progress on the AsyncQueue.
         * Unfortunately we can't verify that the running code is in the promise chain
         * of that operation, so this isn't a foolproof check, but it should be enough
         * to catch some bugs.
         */
        t.prototype.Ns = function() {}, 
        /**
         * Waits until all currently queued tasks are finished executing. Delayed
         * operations are not run.
         */
        t.prototype.xs = function() {
            return __awaiter(this, void 0, void 0, (function() {
                var t;
                return __generator(this, (function(e) {
                    switch (e.label) {
                      case 0:
                        return [ 4 /*yield*/ , t = this.ds ];

                      case 1:
                        e.sent(), e.label = 2;

                      case 2:
                        if (t !== this.ds) return [ 3 /*break*/ , 0 ];
                        e.label = 3;

                      case 3:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * For Tests: Determine if a delayed operation with a particular TimerId
         * exists.
         */
        t.prototype.Fs = function(t) {
            for (var e = 0, n = this.Es; e < n.length; e++) {
                if (n[e]._n === t) return !0;
            }
            return !1;
        }, 
        /**
         * For Tests: Runs some or all delayed operations early.
         *
         * @param lastTimerId Delayed operations up to and including this TimerId will
         *  be drained. Pass TimerId.All to run all delayed operations.
         * @returns a Promise that resolves once all operations have been run.
         */
        t.prototype.Os = function(t) {
            var e = this;
            // Note that draining may generate more delayed ops, so we do that first.
                    return this.xs().then((function() {
                // Run ops in the same order they'd run if they ran naturally.
                e.Es.sort((function(t, e) {
                    return t.os - e.os;
                }));
                for (var n = 0, r = e.Es; n < r.length; n++) {
                    var i = r[n];
                    if (i.Vn(), "all" /* All */ !== t && i._n === t) break;
                }
                return e.xs();
            }));
        }, 
        /**
         * For Tests: Skip all subsequent delays for a timer id.
         */
        t.prototype.Ms = function(t) {
            this.Rs.push(t);
        }, 
        /** Called once a DelayedOperation is run or canceled. */ t.prototype.Cs = function(t) {
            // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
            var e = this.Es.indexOf(t);
            this.Es.splice(e, 1);
        }, t;
    }();

    /**
     * Returns a FirestoreError that can be surfaced to the user if the provided
     * error is an IndexedDbTransactionError. Re-throws the error otherwise.
     */
    function wr(t, e) {
        if (N$1("AsyncQueue", e + ": " + t), cr(t)) return new j(F$1.UNAVAILABLE, e + ": " + t);
        throw t;
    }

    var br = function() {
        this.ks = void 0, this.listeners = [];
    }, _r = function() {
        this.queries = new q$1((function(t) {
            return Mn(t);
        }), Rn), this.onlineState = "Unknown" /* Unknown */ , this.$s = new Set;
    };

    function Ir(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o, u, s, a, c;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    if (e = D$1(t), i = r.query, o = !1, (u = e.queries.get(i)) || (o = !0, u = new br), 
                    !o) return [ 3 /*break*/ , 4 ];
                    n.label = 1;

                  case 1:
                    return n.trys.push([ 1, 3, , 4 ]), s = u, [ 4 /*yield*/ , e.Ls(i) ];

                  case 2:
                    return s.ks = n.sent(), [ 3 /*break*/ , 4 ];

                  case 3:
                    return a = n.sent(), c = wr(a, "Initialization of query '" + Un(r.query) + "' failed"), 
                    [ 2 /*return*/ , void r.onError(c) ];

                  case 4:
                    return e.queries.set(i, u), u.listeners.push(r), 
                    // Run global snapshot listeners if a consistent snapshot has been emitted.
                    r.Bs(e.onlineState), u.ks && r.qs(u.ks) && xr(e), [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function Er(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o, u, s;
            return __generator(this, (function(n) {
                return e = D$1(t), i = r.query, o = !1, (u = e.queries.get(i)) && (s = u.listeners.indexOf(r)) >= 0 && (u.listeners.splice(s, 1), 
                o = 0 === u.listeners.length), o ? [ 2 /*return*/ , (e.queries.delete(i), e.Us(i)) ] : [ 2 /*return*/ ];
            }));
        }));
    }

    function Tr(t, e) {
        for (var n = D$1(t), r = !1, i = 0, o = e; i < o.length; i++) {
            var u = o[i], s = u.query, a = n.queries.get(s);
            if (a) {
                for (var c = 0, h = a.listeners; c < h.length; c++) {
                    h[c].qs(u) && (r = !0);
                }
                a.ks = u;
            }
        }
        r && xr(n);
    }

    function Nr(t, e, n) {
        var r = D$1(t), i = r.queries.get(e);
        if (i) for (var o = 0, u = i.listeners; o < u.length; o++) {
            u[o].onError(n);
        }
        // Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
        // after an error.
            r.queries.delete(e);
    }

    // Call all global snapshot listeners that have been set.
    function xr(t) {
        t.$s.forEach((function(t) {
            t.next();
        }));
    }

    /**
     * QueryListener takes a series of internal view snapshots and determines
     * when to raise the event.
     *
     * It uses an Observer to dispatch events.
     */ var Ar = /** @class */ function() {
        function t(t, e, n) {
            this.query = t, this.Qs = e, 
            /**
                 * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
                 * observer. This flag is set to true once we've actually raised an event.
                 */
            this.Ks = !1, this.Ws = null, this.onlineState = "Unknown" /* Unknown */ , this.options = n || {}
            /**
         * Applies the new ViewSnapshot to this listener, raising a user-facing event
         * if applicable (depending on what changed, whether the user has opted into
         * metadata-only changes, etc.). Returns true if a user-facing event was
         * indeed raised.
         */;
        }
        return t.prototype.qs = function(t) {
            if (!this.options.includeMetadataChanges) {
                for (
                // Remove the metadata only changes.
                var e = [], n = 0, r = t.docChanges; n < r.length; n++) {
                    var i = r[n];
                    3 /* Metadata */ !== i.type && e.push(i);
                }
                t = new At(t.query, t.docs, t.Ut, e, t.Qt, t.fromCache, t.Kt, 
                /* excludesMetadataChanges= */ !0);
            }
            var o = !1;
            return this.Ks ? this.js(t) && (this.Qs.next(t), o = !0) : this.Gs(t, this.onlineState) && (this.zs(t), 
            o = !0), this.Ws = t, o;
        }, t.prototype.onError = function(t) {
            this.Qs.error(t);
        }, 
        /** Returns whether a snapshot was raised. */ t.prototype.Bs = function(t) {
            this.onlineState = t;
            var e = !1;
            return this.Ws && !this.Ks && this.Gs(this.Ws, t) && (this.zs(this.Ws), e = !0), 
            e;
        }, t.prototype.Gs = function(t, e) {
            // Always raise the first event when we're synced
            if (!t.fromCache) return !0;
            // NOTE: We consider OnlineState.Unknown as online (it should become Offline
            // or Online if we wait long enough).
                    var n = "Offline" /* Offline */ !== e;
            // Don't raise the event if we're online, aren't synced yet (checked
            // above) and are waiting for a sync.
                    return !(this.options.Hs && n || t.docs.T() && "Offline" /* Offline */ !== e);
            // Raise data from cache if we have any documents or we are offline
            }, t.prototype.js = function(t) {
            // We don't need to handle includeDocumentMetadataChanges here because
            // the Metadata only changes have already been stripped out if needed.
            // At this point the only changes we will see are the ones we should
            // propagate.
            if (t.docChanges.length > 0) return !0;
            var e = this.Ws && this.Ws.hasPendingWrites !== t.hasPendingWrites;
            return !(!t.Kt && !e) && !0 === this.options.includeMetadataChanges;
            // Generally we should have hit one of the cases above, but it's possible
            // to get here if there were only metadata docChanges and they got
            // stripped out.
            }, t.prototype.zs = function(t) {
            t = At.jt(t.query, t.docs, t.Qt, t.fromCache), this.Ks = !0, this.Qs.next(t);
        }, t;
    }(), Sr = /** @class */ function() {
        function t(t) {
            this.uid = t;
        }
        return t.prototype.Js = function() {
            return null != this.uid;
        }, 
        /**
         * Returns a key representing this user, suitable for inclusion in a
         * dictionary.
         */
        t.prototype.Ys = function() {
            return this.Js() ? "uid:" + this.uid : "anonymous-user";
        }, t.prototype.isEqual = function(t) {
            return t.uid === this.uid;
        }, t;
    }();

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Simple wrapper around a nullable UID. Mostly exists to make code more
     * readable.
     */
    /** A user with a null UID. */ Sr.UNAUTHENTICATED = new Sr(null), 
    // TODO(mikelehen): Look into getting a proper uid-equivalent for
    // non-FirebaseAuth providers.
    Sr.Xs = new Sr("google-credentials-uid"), Sr.Zs = new Sr("first-party-uid");

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var kr = function(t, e) {
        this.user = e, this.type = "OAuth", this.ti = {}, 
        // Set the headers using Object Literal notation to avoid minification
        this.ti.Authorization = "Bearer " + t;
    }, Dr = /** @class */ function() {
        function t() {
            /**
             * Stores the listener registered with setChangeListener()
             * This isn't actually necessary since the UID never changes, but we use this
             * to verify the listen contract is adhered to in tests.
             */
            this.ei = null;
        }
        return t.prototype.getToken = function() {
            return Promise.resolve(null);
        }, t.prototype.ni = function() {}, t.prototype.si = function(t) {
            this.ei = t, 
            // Fire with initial user.
            t(Sr.UNAUTHENTICATED);
        }, t.prototype.ii = function() {
            this.ei = null;
        }, t;
    }(), Or = /** @class */ function() {
        function t(t) {
            var e = this;
            /**
             * The auth token listener registered with FirebaseApp, retained here so we
             * can unregister it.
             */        this.ri = null, 
            /** Tracks the current User. */
            this.currentUser = Sr.UNAUTHENTICATED, this.oi = !1, 
            /**
                 * Counter used to detect if the token changed while a getToken request was
                 * outstanding.
                 */
            this.ai = 0, 
            /** The listener registered with setChangeListener(). */
            this.ei = null, this.forceRefresh = !1, this.ri = function() {
                e.ai++, e.currentUser = e.ci(), e.oi = !0, e.ei && e.ei(e.currentUser);
            }, this.ai = 0, this.auth = t.getImmediate({
                optional: !0
            }), this.auth ? this.auth.addAuthTokenListener(this.ri) : (
            // if auth is not available, invoke tokenListener once with null token
            this.ri(null), t.get().then((function(t) {
                e.auth = t, e.ri && 
                // tokenListener can be removed by removeChangeListener()
                e.auth.addAuthTokenListener(e.ri);
            }), (function() {})));
        }
        return t.prototype.getToken = function() {
            var t = this, e = this.ai, n = this.forceRefresh;
            // Take note of the current value of the tokenCounter so that this method
            // can fail (with an ABORTED error) if there is a token change while the
            // request is outstanding.
                    return this.forceRefresh = !1, this.auth ? this.auth.getToken(n).then((function(n) {
                // Cancel the request since the token changed while the request was
                // outstanding so the response is potentially for a previous user (which
                // user, we can't be sure).
                return t.ai !== e ? (T$1("FirebaseCredentialsProvider", "getToken aborted due to token change."), 
                t.getToken()) : n ? (k$1("string" == typeof n.accessToken), new kr(n.accessToken, t.currentUser)) : null;
            })) : Promise.resolve(null);
        }, t.prototype.ni = function() {
            this.forceRefresh = !0;
        }, t.prototype.si = function(t) {
            this.ei = t, 
            // Fire the initial event
            this.oi && t(this.currentUser);
        }, t.prototype.ii = function() {
            this.auth && this.auth.removeAuthTokenListener(this.ri), this.ri = null, this.ei = null;
        }, 
        // Auth.getUid() can return null even with a user logged in. It is because
        // getUid() is synchronous, but the auth code populating Uid is asynchronous.
        // This method should only be called in the AuthTokenListener callback
        // to guarantee to get the actual user.
        t.prototype.ci = function() {
            var t = this.auth && this.auth.getUid();
            return k$1(null === t || "string" == typeof t), new Sr(t);
        }, t;
    }(), Pr = /** @class */ function() {
        function t(t, e) {
            this.ui = t, this.hi = e, this.type = "FirstParty", this.user = Sr.Zs;
        }
        return Object.defineProperty(t.prototype, "ti", {
            get: function() {
                var t = {
                    "X-Goog-AuthUser": this.hi
                }, e = this.ui.auth.getAuthHeaderValueForFirstParty([]);
                // Use array notation to prevent minification
                            return e && (t.Authorization = e), t;
            },
            enumerable: !1,
            configurable: !0
        }), t;
    }(), Vr = /** @class */ function() {
        function t(t, e) {
            this.ui = t, this.hi = e;
        }
        return t.prototype.getToken = function() {
            return Promise.resolve(new Pr(this.ui, this.hi));
        }, t.prototype.si = function(t) {
            // Fire with initial uid.
            t(Sr.Zs);
        }, t.prototype.ii = function() {}, t.prototype.ni = function() {}, t;
    }(), Cr = /** @class */ function() {
        /**
         * @param batchId The unique ID of this mutation batch.
         * @param localWriteTime The original write time of this mutation.
         * @param baseMutations Mutations that are used to populate the base
         * values when this mutation is applied locally. This can be used to locally
         * overwrite values that are persisted in the remote document cache. Base
         * mutations are never sent to the backend.
         * @param mutations The user-provided mutations in this mutation batch.
         * User-provided mutations are applied both locally and remotely on the
         * backend.
         */
        function t(t, e, n, r) {
            this.batchId = t, this.li = e, this.baseMutations = n, this.mutations = r
            /**
         * Applies all the mutations in this MutationBatch to the specified document
         * to create a new remote document
         *
         * @param docKey The key of the document to apply mutations to.
         * @param maybeDoc The document to apply mutations to.
         * @param batchResult The result of applying the MutationBatch to the
         * backend.
         */;
        }
        return t.prototype._i = function(t, e, n) {
            for (var r = n.fi, i = 0; i < this.mutations.length; i++) {
                var o = this.mutations[i];
                o.key.isEqual(t) && (e = nn(o, e, r[i]));
            }
            return e;
        }, 
        /**
         * Computes the local view of a document given all the mutations in this
         * batch.
         *
         * @param docKey The key of the document to apply mutations to.
         * @param maybeDoc The document to apply mutations to.
         */
        t.prototype.di = function(t, e) {
            // First, apply the base state. This allows us to apply non-idempotent
            // transform against a consistent set of values.
            for (var n = 0, r = this.baseMutations; n < r.length; n++) {
                var i = r[n];
                i.key.isEqual(t) && (e = rn(i, e, e, this.li));
            }
            // Second, apply all user-provided mutations.
            for (var o = e, u = 0, s = this.mutations; u < s.length; u++) {
                var a = s[u];
                a.key.isEqual(t) && (e = rn(a, e, o, this.li));
            }
            return e;
        }, 
        /**
         * Computes the local view for all provided documents given the mutations in
         * this batch.
         */
        t.prototype.wi = function(t) {
            var e = this, n = t;
            // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
            // directly (as done in `applyToLocalView()`), we can reduce the complexity
            // to O(n).
                    return this.mutations.forEach((function(r) {
                var i = e.di(r.key, t.get(r.key));
                i && (n = n.rt(r.key, i));
            })), n;
        }, t.prototype.keys = function() {
            return this.mutations.reduce((function(t, e) {
                return t.add(e.key);
            }), It());
        }, t.prototype.isEqual = function(t) {
            return this.batchId === t.batchId && C$1(this.mutations, t.mutations, (function(t, e) {
                return un(t, e);
            })) && C$1(this.baseMutations, t.baseMutations, (function(t, e) {
                return un(t, e);
            }));
        }, t;
    }(), Lr = /** @class */ function() {
        function t(t, e, n, 
        /**
         * A pre-computed mapping from each mutated document to the resulting
         * version.
         */
        r) {
            this.batch = t, this.Ti = e, this.fi = n, this.Ei = r
            /**
         * Creates a new MutationBatchResult for the given batch and results. There
         * must be one result for each mutation in the batch. This static factory
         * caches a document=>version mapping (docVersions).
         */;
        }
        return t.from = function(e, n, r) {
            k$1(e.mutations.length === r.length);
            for (var i = bt, o = e.mutations, u = 0; u < o.length; u++) i = i.rt(o[u].key, r[u].version);
            return new t(e, n, r, i);
        }, t;
    }(), Rr = /** @class */ function() {
        function t() {
            // A mapping of document key to the new cache entry that should be written (or null if any
            // existing cache entry should be removed).
            this.Ii = new q$1((function(t) {
                return t.toString();
            }), (function(t, e) {
                return t.isEqual(e);
            })), this.mi = !1;
        }
        return t.prototype.Ai = function(t) {
            var e = this.Ii.get(t);
            return e ? e.readTime : z.min();
        }, 
        /**
         * Buffers a `RemoteDocumentCache.addEntry()` call.
         *
         * You can only modify documents that have already been retrieved via
         * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
         */
        t.prototype.Ri = function(t, e) {
            this.Pi(), this.Ii.set(t.key, {
                gi: t,
                readTime: e
            });
        }, 
        /**
         * Buffers a `RemoteDocumentCache.removeEntry()` call.
         *
         * You can only remove documents that have already been retrieved via
         * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
         */
        t.prototype.Vi = function(t, e) {
            void 0 === e && (e = null), this.Pi(), this.Ii.set(t, {
                gi: null,
                readTime: e
            });
        }, 
        /**
         * Looks up an entry in the cache. The buffered changes will first be checked,
         * and if no buffered change applies, this will forward to
         * `RemoteDocumentCache.getEntry()`.
         *
         * @param transaction The transaction in which to perform any persistence
         *     operations.
         * @param documentKey The key of the entry to look up.
         * @return The cached Document or NoDocument entry, or null if we have nothing
         * cached.
         */
        t.prototype.yi = function(t, e) {
            this.Pi();
            var n = this.Ii.get(e);
            return void 0 !== n ? or.resolve(n.gi) : this.pi(t, e);
        }, 
        /**
         * Looks up several entries in the cache, forwarding to
         * `RemoteDocumentCache.getEntry()`.
         *
         * @param transaction The transaction in which to perform any persistence
         *     operations.
         * @param documentKeys The keys of the entries to look up.
         * @return A map of cached `Document`s or `NoDocument`s, indexed by key. If an
         *     entry cannot be found, the corresponding key will be mapped to a null
         *     value.
         */
        t.prototype.getEntries = function(t, e) {
            return this.vi(t, e);
        }, 
        /**
         * Applies buffered changes to the underlying RemoteDocumentCache, using
         * the provided transaction.
         */
        t.prototype.apply = function(t) {
            return this.Pi(), this.mi = !0, this.bi(t);
        }, 
        /** Helper to assert this.changes is not null  */ t.prototype.Pi = function() {}, 
        t;
    }();

    /** A CredentialsProvider that always yields an empty token. */
    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function Mr(t) {
        return new oe(t, /* useProto3Json= */ !0);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ function Ur(t) {
        /**
     * Returns true if obj is an object and contains at least one of the specified
     * methods.
     */
        return function(t, e) {
            if ("object" != typeof t || null === t) return !1;
            for (var n = t, r = 0, i = [ "next", "error", "complete" ]; r < i.length; r++) {
                var o = i[r];
                if (o in n && "function" == typeof n[o]) return !0;
            }
            return !1;
        }(t);
    }

    var qr = "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.", Fr = /** @class */ function() {
        function t() {
            this.Si = [];
        }
        return t.prototype.Di = function(t) {
            this.Si.push(t);
        }, t.prototype.Ci = function() {
            this.Si.forEach((function(t) {
                return t();
            }));
        }, t;
    }(), jr = /** @class */ function() {
        function t(t, e, n) {
            this.Ni = t, this.xi = e, this.Fi = n
            /**
         * Get the local view of the document identified by `key`.
         *
         * @return Local view of the document or null if we don't have any cached
         * state for it.
         */;
        }
        return t.prototype.Oi = function(t, e) {
            var n = this;
            return this.xi.Mi(t, e).next((function(r) {
                return n.ki(t, e, r);
            }));
        }, 
        /** Internal version of `getDocument` that allows reusing batches. */ t.prototype.ki = function(t, e, n) {
            return this.Ni.yi(t, e).next((function(t) {
                for (var r = 0, i = n; r < i.length; r++) {
                    t = i[r].di(e, t);
                }
                return t;
            }));
        }, 
        // Returns the view of the given `docs` as they would appear after applying
        // all mutations in the given `batches`.
        t.prototype.$i = function(t, e, n) {
            var r = gt();
            return e.forEach((function(t, e) {
                for (var i = 0, o = n; i < o.length; i++) {
                    e = o[i].di(t, e);
                }
                r = r.rt(t, e);
            })), r;
        }, 
        /**
         * Gets the local view of the documents identified by `keys`.
         *
         * If we don't have cached state for a document in `keys`, a NoDocument will
         * be stored for that key in the resulting set.
         */
        t.prototype.Li = function(t, e) {
            var n = this;
            return this.Ni.getEntries(t, e).next((function(e) {
                return n.Bi(t, e);
            }));
        }, 
        /**
         * Similar to `getDocuments`, but creates the local view from the given
         * `baseDocs` without retrieving documents from the local store.
         */
        t.prototype.Bi = function(t, e) {
            var n = this;
            return this.xi.qi(t, e).next((function(r) {
                var i = n.$i(t, e, r), o = yt();
                return i.forEach((function(t, e) {
                    // TODO(http://b/32275378): Don't conflate missing / deleted.
                    e || (e = new _n(t, z.min())), o = o.rt(t, e);
                })), o;
            }));
        }, 
        /**
         * Performs a query against the local view of all documents.
         *
         * @param transaction The persistence transaction.
         * @param query The query to match documents against.
         * @param sinceReadTime If not set to SnapshotVersion.min(), return only
         *     documents that have been read since this snapshot version (exclusive).
         */
        t.prototype.Ui = function(t, e, n) {
            /**
     * Returns whether the query matches a single document by path (rather than a
     * collection).
     */
            return function(t) {
                return Y$1.G(t.path) && null === t.collectionGroup && 0 === t.filters.length;
            }(e) ? this.Qi(t, e.path) : Dn(e) ? this.Ki(t, e, n) : this.Wi(t, e, n);
        }, t.prototype.Qi = function(t, e) {
            // Just do a simple document lookup.
            return this.Oi(t, new Y$1(e)).next((function(t) {
                var e = wt();
                return t instanceof bn && (e = e.rt(t.key, t)), e;
            }));
        }, t.prototype.Ki = function(t, e, n) {
            var r = this, i = e.collectionGroup, o = wt();
            return this.Fi.ji(t, i).next((function(u) {
                return or.forEach(u, (function(u) {
                    var s = function(t, e) {
                        return new En(e, 
                        /*collectionGroup=*/ null, t.rn.slice(), t.filters.slice(), t.limit, t.limitType, t.startAt, t.endAt);
                    }(e, u.child(i));
                    return r.Wi(t, s, n).next((function(t) {
                        t.forEach((function(t, e) {
                            o = o.rt(t, e);
                        }));
                    }));
                })).next((function() {
                    return o;
                }));
            }));
        }, t.prototype.Wi = function(t, e, n) {
            var r, i, o = this;
            // Query the remote documents and overlay mutations.
                    return this.Ni.Ui(t, e, n).next((function(n) {
                return r = n, o.xi.Gi(t, e);
            })).next((function(e) {
                return i = e, o.zi(t, i, r).next((function(t) {
                    r = t;
                    for (var e = 0, n = i; e < n.length; e++) for (var o = n[e], u = 0, s = o.mutations; u < s.length; u++) {
                        var a = s[u], c = a.key, h = r.get(c), f = rn(a, h, h, o.li);
                        r = f instanceof bn ? r.rt(c, f) : r.remove(c);
                    }
                }));
            })).next((function() {
                // Finally, filter out any documents that don't actually match
                // the query.
                return r.forEach((function(t, n) {
                    qn(e, n) || (r = r.remove(t));
                })), r;
            }));
        }, t.prototype.zi = function(t, e, n) {
            for (var r = It(), i = 0, o = e; i < o.length; i++) for (var u = 0, s = o[i].mutations; u < s.length; u++) {
                var a = s[u];
                a instanceof cn && null === n.get(a.key) && (r = r.add(a.key));
            }
            var c = n;
            return this.Ni.getEntries(t, r).next((function(t) {
                return t.forEach((function(t, e) {
                    null !== e && e instanceof bn && (c = c.rt(t, e));
                })), c;
            }));
        }, t;
    }(), Br = /** @class */ function() {
        function t(t, e, n, r) {
            this.targetId = t, this.fromCache = e, this.Hi = n, this.Ji = r;
        }
        return t.Yi = function(e, n) {
            for (var r = It(), i = It(), o = 0, u = n.docChanges; o < u.length; o++) {
                var s = u[o];
                switch (s.type) {
                  case 0 /* Added */ :
                    r = r.add(s.doc.key);
                    break;

                  case 1 /* Removed */ :
                    i = i.add(s.doc.key);
                    // do nothing
                            }
            }
            return new t(e, n.fromCache, r, i);
        }, t;
    }(), zr = /** @class */ function() {
        function t(t, e) {
            var n = this;
            this.previousValue = t, e && (e.Xi = function(t) {
                return n.Zi(t);
            }, this.tr = function(t) {
                return e.er(t);
            });
        }
        return t.prototype.Zi = function(t) {
            return this.previousValue = Math.max(t, this.previousValue), this.previousValue;
        }, t.prototype.next = function() {
            var t = ++this.previousValue;
            return this.tr && this.tr(t), t;
        }, t;
    }();

    /**
     * A base class representing a persistence transaction, encapsulating both the
     * transaction's sequence numbers as well as a list of onCommitted listeners.
     *
     * When you call Persistence.runTransaction(), it will create a transaction and
     * pass it to your callback. You then pass it to any method that operates
     * on persistence.
     */ function Gr(t, e) {
        var n = t[0], r = t[1], i = e[0], o = e[1], u = V$1(n, i);
        return 0 === u ? V$1(r, o) : u;
    }

    /**
     * Used to calculate the nth sequence number. Keeps a rolling buffer of the
     * lowest n values passed to `addElement`, and finally reports the largest of
     * them in `maxValue`.
     */ zr.nr = -1;

    var Kr = /** @class */ function() {
        function t(t) {
            this.sr = t, this.buffer = new pt(Gr), this.ir = 0;
        }
        return t.prototype.rr = function() {
            return ++this.ir;
        }, t.prototype.ar = function(t) {
            var e = [ t, this.rr() ];
            if (this.buffer.size < this.sr) this.buffer = this.buffer.add(e); else {
                var n = this.buffer.last();
                Gr(e, n) < 0 && (this.buffer = this.buffer.delete(n).add(e));
            }
        }, Object.defineProperty(t.prototype, "maxValue", {
            get: function() {
                // Guaranteed to be non-empty. If we decide we are not collecting any
                // sequence numbers, nthSequenceNumber below short-circuits. If we have
                // decided that we are collecting n sequence numbers, it's because n is some
                // percentage of the existing sequence numbers. That means we should never
                // be in a situation where we are collecting sequence numbers but don't
                // actually have any.
                return this.buffer.last()[0];
            },
            enumerable: !1,
            configurable: !0
        }), t;
    }(), Qr = {
        cr: !1,
        ur: 0,
        hr: 0,
        lr: 0
    }, Wr = /** @class */ function() {
        function t(
        // When we attempt to collect, we will only do so if the cache size is greater than this
        // threshold. Passing `COLLECTION_DISABLED` here will cause collection to always be skipped.
        t, 
        // The percentage of sequence numbers that we will attempt to collect
        e, 
        // A cap on the total number of sequence numbers that will be collected. This prevents
        // us from collecting a huge number of sequence numbers if the cache has grown very large.
        n) {
            this._r = t, this.dr = e, this.wr = n;
        }
        return t.Tr = function(e) {
            return new t(e, t.Er, t.Ir);
        }, t;
    }();

    Wr.Er = 10, Wr.Ir = 1e3, Wr.mr = new Wr(41943040, Wr.Er, Wr.Ir), Wr.Ar = new Wr(-1, 0, 0);

    /**
     * This class is responsible for the scheduling of LRU garbage collection. It handles checking
     * whether or not GC is enabled, as well as which delay to use before the next run.
     */
    var Yr = /** @class */ function() {
        function t(t, e) {
            this.Rr = t, this.rs = e, this.Pr = !1, this.gr = null;
        }
        return t.prototype.start = function(t) {
            -1 !== this.Rr.params._r && this.Vr(t);
        }, t.prototype.stop = function() {
            this.gr && (this.gr.cancel(), this.gr = null);
        }, Object.defineProperty(t.prototype, "yr", {
            get: function() {
                return null !== this.gr;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.Vr = function(t) {
            var r = this, i = this.Pr ? 3e5 : 6e4;
            T$1("LruGarbageCollector", "Garbage collection scheduled in " + i + "ms"), this.gr = this.rs.Pn("lru_garbage_collection" /* LruGarbageCollection */ , i, (function() {
                return __awaiter(r, void 0, void 0, (function() {
                    var e;
                    return __generator(this, (function(n) {
                        switch (n.label) {
                          case 0:
                            this.gr = null, this.Pr = !0, n.label = 1;

                          case 1:
                            return n.trys.push([ 1, 3, , 7 ]), [ 4 /*yield*/ , t.pr(this.Rr) ];

                          case 2:
                            return n.sent(), [ 3 /*break*/ , 7 ];

                          case 3:
                            return cr(e = n.sent()) ? (T$1("LruGarbageCollector", "Ignoring IndexedDB error during garbage collection: ", e), 
                            [ 3 /*break*/ , 6 ]) : [ 3 /*break*/ , 4 ];

                          case 4:
                            return [ 4 /*yield*/ , Io(e) ];

                          case 5:
                            n.sent(), n.label = 6;

                          case 6:
                            return [ 3 /*break*/ , 7 ];

                          case 7:
                            return [ 4 /*yield*/ , this.Vr(t) ];

                          case 8:
                            return n.sent(), [ 2 /*return*/ ];
                        }
                    }));
                }));
            }));
        }, t;
    }(), Hr = /** @class */ function() {
        function t(t, e) {
            this.vr = t, this.params = e
            /** Given a percentile of target to collect, returns the number of targets to collect. */;
        }
        return t.prototype.br = function(t, e) {
            return this.vr.Sr(t).next((function(t) {
                return Math.floor(e / 100 * t);
            }));
        }, 
        /** Returns the nth sequence number, counting in order from the smallest. */ t.prototype.Dr = function(t, e) {
            var n = this;
            if (0 === e) return or.resolve(zr.nr);
            var r = new Kr(e);
            return this.vr.De(t, (function(t) {
                return r.ar(t.sequenceNumber);
            })).next((function() {
                return n.vr.Cr(t, (function(t) {
                    return r.ar(t);
                }));
            })).next((function() {
                return r.maxValue;
            }));
        }, 
        /**
         * Removes targets with a sequence number equal to or less than the given upper bound, and removes
         * document associations with those targets.
         */
        t.prototype.Nr = function(t, e, n) {
            return this.vr.Nr(t, e, n);
        }, 
        /**
         * Removes documents that have a sequence number equal to or less than the upper bound and are not
         * otherwise pinned.
         */
        t.prototype.Fr = function(t, e) {
            return this.vr.Fr(t, e);
        }, t.prototype.Or = function(t, e) {
            var n = this;
            return -1 === this.params._r ? (T$1("LruGarbageCollector", "Garbage collection skipped; disabled"), 
            or.resolve(Qr)) : this.Mr(t).next((function(r) {
                return r < n.params._r ? (T$1("LruGarbageCollector", "Garbage collection skipped; Cache size " + r + " is lower than threshold " + n.params._r), 
                Qr) : n.kr(t, e);
            }));
        }, t.prototype.Mr = function(t) {
            return this.vr.Mr(t);
        }, t.prototype.kr = function(t, e) {
            var n, r, i, o, s, a, c, h = this, f = Date.now();
            return this.br(t, this.params.dr).next((function(e) {
                // Cap at the configured max
                return e > h.params.wr ? (T$1("LruGarbageCollector", "Capping sequence numbers to collect down to the maximum of " + h.params.wr + " from " + e), 
                r = h.params.wr) : r = e, o = Date.now(), h.Dr(t, r);
            })).next((function(r) {
                return n = r, s = Date.now(), h.Nr(t, n, e);
            })).next((function(e) {
                return i = e, a = Date.now(), h.Fr(t, n);
            })).next((function(t) {
                return c = Date.now(), E$1() <= LogLevel.DEBUG && T$1("LruGarbageCollector", "LRU Garbage Collection\n\tCounted targets in " + (o - f) + "ms\n\tDetermined least recently used " + r + " in " + (s - o) + "ms\n\tRemoved " + i + " targets in " + (a - s) + "ms\n\tRemoved " + t + " documents in " + (c - a) + "ms\nTotal Duration: " + (c - f) + "ms"), 
                or.resolve({
                    cr: !0,
                    ur: r,
                    hr: i,
                    lr: t
                });
            }));
        }, t;
    }();

    /** Implements the steps for LRU garbage collection. */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Encodes a resource path into a IndexedDb-compatible string form.
     */
    function Jr(t) {
        for (var e = "", n = 0; n < t.length; n++) e.length > 0 && (e = $r(e)), e = Xr(t.get(n), e);
        return $r(e);
    }

    /** Encodes a single segment of a resource path into the given result */ function Xr(t, e) {
        for (var n = e, r = t.length, i = 0; i < r; i++) {
            var o = t.charAt(i);
            switch (o) {
              case "\0":
                n += "";
                break;

              case "":
                n += "";
                break;

              default:
                n += o;
            }
        }
        return n;
    }

    /** Encodes a path separator into the given result */ function $r(t) {
        return t + "";
    }

    /**
     * Decodes the given IndexedDb-compatible string form of a resource path into
     * a ResourcePath instance. Note that this method is not suitable for use with
     * decoding resource names from the server; those are One Platform format
     * strings.
     */ function Zr(t) {
        // Event the empty path must encode as a path of at least length 2. A path
        // with exactly 2 must be the empty path.
        var e = t.length;
        if (k$1(e >= 2), 2 === e) return k$1("" === t.charAt(0) && "" === t.charAt(1)), K$1.$();
        // Escape characters cannot exist past the second-to-last position in the
        // source value.
            for (var n = e - 2, r = [], i = "", o = 0; o < e; ) {
            // The last two characters of a valid encoded path must be a separator, so
            // there must be an end to this segment.
            var u = t.indexOf("", o);
            switch ((u < 0 || u > n) && S$1(), t.charAt(u + 1)) {
              case "":
                var s = t.substring(o, u), a = void 0;
                0 === i.length ? 
                // Avoid copying for the common case of a segment that excludes \0
                // and \001
                a = s : (a = i += s, i = ""), r.push(a);
                break;

              case "":
                i += t.substring(o, u), i += "\0";
                break;

              case "":
                // The escape character can be used in the output to encode itself.
                i += t.substring(o, u + 1);
                break;

              default:
                S$1();
            }
            o = u + 2;
        }
        return new K$1(r);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Serializer for values stored in the LocalStore. */ var ti = function(t) {
        this.$r = t;
    };

    /** Decodes a remote document from storage locally to a Document. */ function ei(t, e) {
        if (e.document) return function(t, e, n) {
            var r = ye(t, e.name), i = le(e.updateTime), o = new yn({
                mapValue: {
                    fields: e.fields
                }
            });
            return new bn(r, i, o, {
                hasCommittedMutations: !!n
            });
        }(t.$r, e.document, !!e.hasCommittedMutations);
        if (e.noDocument) {
            var n = Y$1.H(e.noDocument.path), r = ui(e.noDocument.readTime);
            return new _n(n, r, {
                hasCommittedMutations: !!e.hasCommittedMutations
            });
        }
        if (e.unknownDocument) {
            var i = Y$1.H(e.unknownDocument.path), o = ui(e.unknownDocument.version);
            return new In(i, o);
        }
        return S$1();
    }

    /** Encodes a document for storage locally. */ function ni(t, e, n) {
        var r = ri(n), i = e.key.path.S().O();
        if (e instanceof bn) {
            var o = function(t, e) {
                return {
                    name: ve(t, e.key),
                    fields: e.sn().mapValue.fields,
                    updateTime: ce(t, e.version.P())
                };
            }(t.$r, e), u = e.hasCommittedMutations;
            return new Vi(
            /* unknownDocument= */ null, 
            /* noDocument= */ null, o, u, r, i);
        }
        if (e instanceof _n) {
            var s = e.key.path.O(), a = oi(e.version), c = e.hasCommittedMutations;
            return new Vi(
            /* unknownDocument= */ null, new Oi(s, a), 
            /* document= */ null, c, r, i);
        }
        if (e instanceof In) {
            var h = e.key.path.O(), f = oi(e.version);
            return new Vi(new Pi(h, f), 
            /* noDocument= */ null, 
            /* document= */ null, 
            /* hasCommittedMutations= */ !0, r, i);
        }
        return S$1();
    }

    function ri(t) {
        var e = t.P();
        return [ e.seconds, e.nanoseconds ];
    }

    function ii(t) {
        var e = new B(t[0], t[1]);
        return z.m(e);
    }

    function oi(t) {
        var e = t.P();
        return new xi(e.seconds, e.nanoseconds);
    }

    function ui(t) {
        var e = new B(t.seconds, t.nanoseconds);
        return z.m(e);
    }

    /** Encodes a batch of mutations into a DbMutationBatch for local storage. */
    /** Decodes a DbMutationBatch into a MutationBatch */ function si(t, e) {
        var n = (e.baseMutations || []).map((function(e) {
            return Ee(t.$r, e);
        })), r = e.mutations.map((function(e) {
            return Ee(t.$r, e);
        })), i = B.fromMillis(e.localWriteTimeMs);
        return new Cr(e.batchId, i, n, r);
    }

    /** Decodes a DbTarget into TargetData */ function ai(t) {
        var e, n, r = ui(t.readTime), i = void 0 !== t.lastLimboFreeSnapshotVersion ? ui(t.lastLimboFreeSnapshotVersion) : z.min();
        return void 0 !== t.query.documents ? (k$1(1 === (n = t.query).documents.length), 
        e = Pn(Nn(me(n.documents[0])))) : e = function(t) {
            return Pn(xe(t));
        }(t.query), new ut(e, t.targetId, 0 /* Listen */ , t.lastListenSequenceNumber, r, i, rt.fromBase64String(t.resumeToken))
        /** Encodes TargetData into a DbTarget for storage locally. */;
    }

    function ci(t, e) {
        var n, r = oi(e.et), i = oi(e.lastLimboFreeSnapshotVersion);
        n = nt(e.target) ? Te(t.$r, e.target) : Ne(t.$r, e.target);
        // We can't store the resumeToken as a ByteString in IndexedDb, so we
        // convert it to a base64 string for storage.
        var o = e.resumeToken.toBase64();
        // lastListenSequenceNumber is always 0 until we do real GC.
            return new Li(e.targetId, tt(e.target), r, o, e.sequenceNumber, i, n);
    }

    /**
     * A helper function for figuring out what kind of query has been stored.
     */
    /**
     * Encodes a `BundledQuery` from bundle proto to a Query object.
     *
     * This reconstructs the original query used to build the bundle being loaded,
     * including features exists only in SDKs (for example: limit-to-last).
     */ function hi(t) {
        var e = xe({
            parent: t.parent,
            structuredQuery: t.structuredQuery
        });
        return "LAST" === t.limitType ? Vn(e, e.limit, "L" /* Last */) : e;
    }

    /** Encodes a NamedQuery proto object to a NamedQuery model object. */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** A mutation queue for a specific user, backed by IndexedDB. */ var fi = /** @class */ function() {
        function t(
        /**
         * The normalized userId (e.g. null UID => "" userId) used to store /
         * retrieve mutations.
         */
        t, e, n, r) {
            this.userId = t, this.serializer = e, this.Fi = n, this.Lr = r, 
            /**
                 * Caches the document keys for pending mutation batches. If the mutation
                 * has been removed from IndexedDb, the cached value may continue to
                 * be used to retrieve the batch's document keys. To remove a cached value
                 * locally, `removeCachedMutationKeys()` should be invoked either directly
                 * or through `removeMutationBatches()`.
                 *
                 * With multi-tab, when the primary client acknowledges or rejects a mutation,
                 * this cache is used by secondary clients to invalidate the local
                 * view of the documents that were previously affected by the mutation.
                 */
            // PORTING NOTE: Multi-tab only.
            this.Br = {}
            /**
         * Creates a new mutation queue for the given user.
         * @param user The user for which to create a mutation queue.
         * @param serializer The serializer to use when persisting to IndexedDb.
         */;
        }
        return t.qr = function(e, n, r, i) {
            // TODO(mcg): Figure out what constraints there are on userIDs
            // In particular, are there any reserved characters? are empty ids allowed?
            // For the moment store these together in the same mutations table assuming
            // that empty userIDs aren't allowed.
            return k$1("" !== e.uid), new t(e.Js() ? e.uid : "", n, r, i);
        }, t.prototype.Ur = function(t) {
            var e = !0, n = IDBKeyRange.bound([ this.userId, Number.NEGATIVE_INFINITY ], [ this.userId, Number.POSITIVE_INFINITY ]);
            return di(t).ns({
                index: ki.userMutationsIndex,
                range: n
            }, (function(t, n, r) {
                e = !1, r.done();
            })).next((function() {
                return e;
            }));
        }, t.prototype.Qr = function(t, e, n, r) {
            var i = this, o = vi(t), u = di(t);
            // The IndexedDb implementation in Chrome (and Firefox) does not handle
            // compound indices that include auto-generated keys correctly. To ensure
            // that the index entry is added correctly in all browsers, we perform two
            // writes: The first write is used to retrieve the next auto-generated Batch
            // ID, and the second write populates the index and stores the actual
            // mutation batch.
            // See: https://bugs.chromium.org/p/chromium/issues/detail?id=701972
            // We write an empty object to obtain key
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return u.add({}).next((function(s) {
                k$1("number" == typeof s);
                for (var a = new Cr(s, e, n, r), c = function(t, e, n) {
                    var r = n.baseMutations.map((function(e) {
                        return Ie(t.$r, e);
                    })), i = n.mutations.map((function(e) {
                        return Ie(t.$r, e);
                    }));
                    return new ki(e, n.batchId, n.li.toMillis(), r, i);
                }(i.serializer, i.userId, a), h = [], f = new pt((function(t, e) {
                    return V$1(t.M(), e.M());
                })), l = 0, p = r; l < p.length; l++) {
                    var d = p[l], v = Di.key(i.userId, d.key.path, s);
                    f = f.add(d.key.path.S()), h.push(u.put(c)), h.push(o.put(v, Di.PLACEHOLDER));
                }
                return f.forEach((function(e) {
                    h.push(i.Fi.Kr(t, e));
                })), t.Di((function() {
                    i.Br[s] = a.keys();
                })), or.xn(h).next((function() {
                    return a;
                }));
            }));
        }, t.prototype.Wr = function(t, e) {
            var n = this;
            return di(t).get(e).next((function(t) {
                return t ? (k$1(t.userId === n.userId), si(n.serializer, t)) : null;
            }));
        }, 
        /**
         * Returns the document keys for the mutation batch with the given batchId.
         * For primary clients, this method returns `null` after
         * `removeMutationBatches()` has been called. Secondary clients return a
         * cached result until `removeCachedMutationKeys()` is invoked.
         */
        // PORTING NOTE: Multi-tab only.
        t.prototype.jr = function(t, e) {
            var n = this;
            return this.Br[e] ? or.resolve(this.Br[e]) : this.Wr(t, e).next((function(t) {
                if (t) {
                    var r = t.keys();
                    return n.Br[e] = r, r;
                }
                return null;
            }));
        }, t.prototype.Gr = function(t, e) {
            var n = this, r = e + 1, i = IDBKeyRange.lowerBound([ this.userId, r ]), o = null;
            return di(t).ns({
                index: ki.userMutationsIndex,
                range: i
            }, (function(t, e, i) {
                e.userId === n.userId && (k$1(e.batchId >= r), o = si(n.serializer, e)), i.done();
            })).next((function() {
                return o;
            }));
        }, t.prototype.zr = function(t) {
            var e = IDBKeyRange.upperBound([ this.userId, Number.POSITIVE_INFINITY ]), n = -1;
            return di(t).ns({
                index: ki.userMutationsIndex,
                range: e,
                reverse: !0
            }, (function(t, e, r) {
                n = e.batchId, r.done();
            })).next((function() {
                return n;
            }));
        }, t.prototype.Hr = function(t) {
            var e = this, n = IDBKeyRange.bound([ this.userId, -1 ], [ this.userId, Number.POSITIVE_INFINITY ]);
            return di(t).Xn(ki.userMutationsIndex, n).next((function(t) {
                return t.map((function(t) {
                    return si(e.serializer, t);
                }));
            }));
        }, t.prototype.Mi = function(t, e) {
            var n = this, r = Di.prefixForPath(this.userId, e.path), i = IDBKeyRange.lowerBound(r), o = [];
            // Scan the document-mutation index starting with a prefix starting with
            // the given documentKey.
                    return vi(t).ns({
                range: i
            }, (function(r, i, u) {
                var s = r[0], a = r[1], c = r[2], h = Zr(a);
                // Only consider rows matching exactly the specific key of
                // interest. Note that because we order by path first, and we
                // order terminators before path separators, we'll encounter all
                // the index rows for documentKey contiguously. In particular, all
                // the rows for documentKey will occur before any rows for
                // documents nested in a subcollection beneath documentKey so we
                // can stop as soon as we hit any such row.
                            if (s === n.userId && e.path.isEqual(h)) 
                // Look up the mutation batch in the store.
                return di(t).get(c).next((function(t) {
                    if (!t) throw S$1();
                    k$1(t.userId === n.userId), o.push(si(n.serializer, t));
                }));
                u.done();
            })).next((function() {
                return o;
            }));
        }, t.prototype.qi = function(t, e) {
            var n = this, r = new pt(V$1), i = [];
            return e.forEach((function(e) {
                var o = Di.prefixForPath(n.userId, e.path), u = IDBKeyRange.lowerBound(o), s = vi(t).ns({
                    range: u
                }, (function(t, i, o) {
                    var u = t[0], s = t[1], a = t[2], c = Zr(s);
                    // Only consider rows matching exactly the specific key of
                    // interest. Note that because we order by path first, and we
                    // order terminators before path separators, we'll encounter all
                    // the index rows for documentKey contiguously. In particular, all
                    // the rows for documentKey will occur before any rows for
                    // documents nested in a subcollection beneath documentKey so we
                    // can stop as soon as we hit any such row.
                                    u === n.userId && e.path.isEqual(c) ? r = r.add(a) : o.done();
                }));
                i.push(s);
            })), or.xn(i).next((function() {
                return n.Jr(t, r);
            }));
        }, t.prototype.Gi = function(t, e) {
            var n = this, r = e.path, i = r.length + 1, o = Di.prefixForPath(this.userId, r), u = IDBKeyRange.lowerBound(o), s = new pt(V$1);
            return vi(t).ns({
                range: u
            }, (function(t, e, o) {
                var u = t[0], a = t[1], c = t[2], h = Zr(a);
                u === n.userId && r.N(h) ? 
                // Rows with document keys more than one segment longer than the
                // query path can't be matches. For example, a query on 'rooms'
                // can't match the document /rooms/abc/messages/xyx.
                // TODO(mcg): we'll need a different scanner when we implement
                // ancestor queries.
                h.length === i && (s = s.add(c)) : o.done();
            })).next((function() {
                return n.Jr(t, s);
            }));
        }, t.prototype.Jr = function(t, e) {
            var n = this, r = [], i = [];
            // TODO(rockwood): Implement this using iterate.
            return e.forEach((function(e) {
                i.push(di(t).get(e).next((function(t) {
                    if (null === t) throw S$1();
                    k$1(t.userId === n.userId), r.push(si(n.serializer, t));
                })));
            })), or.xn(i).next((function() {
                return r;
            }));
        }, t.prototype.Yr = function(t, e) {
            var n = this;
            return pi(t.Xr, this.userId, e).next((function(r) {
                return t.Di((function() {
                    n.Zr(e.batchId);
                })), or.forEach(r, (function(e) {
                    return n.Lr.eo(t, e);
                }));
            }));
        }, 
        /**
         * Clears the cached keys for a mutation batch. This method should be
         * called by secondary clients after they process mutation updates.
         *
         * Note that this method does not have to be called from primary clients as
         * the corresponding cache entries are cleared when an acknowledged or
         * rejected batch is removed from the mutation queue.
         */
        // PORTING NOTE: Multi-tab only
        t.prototype.Zr = function(t) {
            delete this.Br[t];
        }, t.prototype.no = function(t) {
            var e = this;
            return this.Ur(t).next((function(n) {
                if (!n) return or.resolve();
                // Verify that there are no entries in the documentMutations index if
                // the queue is empty.
                            var r = IDBKeyRange.lowerBound(Di.prefixForUser(e.userId)), i = [];
                return vi(t).ns({
                    range: r
                }, (function(t, n, r) {
                    if (t[0] === e.userId) {
                        var o = Zr(t[1]);
                        i.push(o);
                    } else r.done();
                })).next((function() {
                    k$1(0 === i.length);
                }));
            }));
        }, t.prototype.so = function(t, e) {
            return li(t, this.userId, e);
        }, 
        // PORTING NOTE: Multi-tab only (state is held in memory in other clients).
        /** Returns the mutation queue's metadata from IndexedDb. */
        t.prototype.io = function(t) {
            var e = this;
            return yi(t).get(this.userId).next((function(t) {
                return t || new Si(e.userId, -1, 
                /*lastStreamToken=*/ "");
            }));
        }, t;
    }();

    /**
     * @return true if the mutation queue for the given user contains a pending
     *         mutation for the given key.
     */ function li(t, e, n) {
        var r = Di.prefixForPath(e, n.path), i = r[1], o = IDBKeyRange.lowerBound(r), u = !1;
        return vi(t).ns({
            range: o,
            es: !0
        }, (function(t, n, r) {
            var o = t[0], s = t[1];
            t[2];
            o === e && s === i && (u = !0), r.done();
        })).next((function() {
            return u;
        }));
    }

    /** Returns true if any mutation queue contains the given document. */
    /**
     * Delete a mutation batch and the associated document mutations.
     * @return A PersistencePromise of the document mutations that were removed.
     */ function pi(t, e, n) {
        var r = t.store(ki.store), i = t.store(Di.store), o = [], u = IDBKeyRange.only(n.batchId), s = 0, a = r.ns({
            range: u
        }, (function(t, e, n) {
            return s++, n.delete();
        }));
        o.push(a.next((function() {
            k$1(1 === s);
        })));
        for (var c = [], h = 0, f = n.mutations; h < f.length; h++) {
            var l = f[h], p = Di.key(e, l.key.path, n.batchId);
            o.push(i.delete(p)), c.push(l.key);
        }
        return or.xn(o).next((function() {
            return c;
        }));
    }

    /**
     * Helper to get a typed SimpleDbStore for the mutations object store.
     */ function di(t) {
        return no.qn(t, ki.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the mutationQueues object store.
     */ function vi(t) {
        return no.qn(t, Di.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the mutationQueues object store.
     */ function yi(t) {
        return no.qn(t, Si.store);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The RemoteDocumentCache for IndexedDb. To construct, invoke
     * `newIndexedDbRemoteDocumentCache()`.
     */ var gi = /** @class */ function() {
        /**
         * @param serializer The document serializer.
         * @param indexManager The query indexes that need to be maintained.
         */
        function t(t, e) {
            this.serializer = t, this.Fi = e
            /**
         * Adds the supplied entries to the cache.
         *
         * All calls of `addEntry` are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
         */;
        }
        return t.prototype.Ri = function(t, e, n) {
            return bi(t).put(_i(e), n);
        }, 
        /**
         * Removes a document from the cache.
         *
         * All calls of `removeEntry`  are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
         */
        t.prototype.Vi = function(t, e) {
            var n = bi(t), r = _i(e);
            return n.delete(r);
        }, 
        /**
         * Updates the current cache size.
         *
         * Callers to `addEntry()` and `removeEntry()` *must* call this afterwards to update the
         * cache's metadata.
         */
        t.prototype.updateMetadata = function(t, e) {
            var n = this;
            return this.getMetadata(t).next((function(r) {
                return r.byteSize += e, n.ro(t, r);
            }));
        }, t.prototype.yi = function(t, e) {
            var n = this;
            return bi(t).get(_i(e)).next((function(t) {
                return n.oo(t);
            }));
        }, 
        /**
         * Looks up an entry in the cache.
         *
         * @param documentKey The key of the entry to look up.
         * @return The cached MaybeDocument entry and its size, or null if we have nothing cached.
         */
        t.prototype.ao = function(t, e) {
            var n = this;
            return bi(t).get(_i(e)).next((function(t) {
                var e = n.oo(t);
                return e ? {
                    gi: e,
                    size: Ii(t)
                } : null;
            }));
        }, t.prototype.getEntries = function(t, e) {
            var n = this, r = gt();
            return this.co(t, e, (function(t, e) {
                var i = n.oo(e);
                r = r.rt(t, i);
            })).next((function() {
                return r;
            }));
        }, 
        /**
         * Looks up several entries in the cache.
         *
         * @param documentKeys The set of keys entries to look up.
         * @return A map of MaybeDocuments indexed by key (if a document cannot be
         *     found, the key will be mapped to null) and a map of sizes indexed by
         *     key (zero if the key cannot be found).
         */
        t.prototype.uo = function(t, e) {
            var n = this, r = gt(), i = new ht(Y$1.V);
            return this.co(t, e, (function(t, e) {
                var o = n.oo(e);
                o ? (r = r.rt(t, o), i = i.rt(t, Ii(e))) : (r = r.rt(t, null), i = i.rt(t, 0));
            })).next((function() {
                return {
                    ho: r,
                    lo: i
                };
            }));
        }, t.prototype.co = function(t, e, n) {
            if (e.T()) return or.resolve();
            var r = IDBKeyRange.bound(e.first().path.O(), e.last().path.O()), i = e.lt(), o = i.Et();
            return bi(t).ns({
                range: r
            }, (function(t, e, r) {
                // Go through keys not found in cache.
                for (var u = Y$1.H(t); o && Y$1.V(o, u) < 0; ) n(o, null), o = i.Et();
                o && o.isEqual(u) && (
                // Key found in cache.
                n(o, e), o = i.It() ? i.Et() : null), 
                // Skip to the next key (if there is one).
                o ? r.Jn(o.path.O()) : r.done();
            })).next((function() {
                // The rest of the keys are not in the cache. One case where `iterate`
                // above won't go through them is when the cache is empty.
                for (;o; ) n(o, null), o = i.It() ? i.Et() : null;
            }));
        }, t.prototype.Ui = function(t, e, n) {
            var r = this, i = wt(), o = e.path.length + 1, u = {};
            if (n.isEqual(z.min())) {
                // Documents are ordered by key, so we can use a prefix scan to narrow
                // down the documents we need to match the query against.
                var s = e.path.O();
                u.range = IDBKeyRange.lowerBound(s);
            } else {
                // Execute an index-free query and filter by read time. This is safe
                // since all document changes to queries that have a
                // lastLimboFreeSnapshotVersion (`sinceReadTime`) have a read time set.
                var a = e.path.O(), c = ri(n);
                u.range = IDBKeyRange.lowerBound([ a, c ], 
                /* open= */ !0), u.index = Vi.collectionReadTimeIndex;
            }
            return bi(t).ns(u, (function(t, n, u) {
                // The query is actually returning any path that starts with the query
                // path prefix which may include documents in subcollections. For
                // example, a query on 'rooms' will return rooms/abc/messages/xyx but we
                // shouldn't match it. Fix this by discarding rows with document keys
                // more than one segment longer than the query path.
                if (t.length === o) {
                    var s = ei(r.serializer, n);
                    e.path.N(s.key.path) ? s instanceof bn && qn(e, s) && (i = i.rt(s.key, s)) : u.done();
                }
            })).next((function() {
                return i;
            }));
        }, t.prototype._o = function(t) {
            return new mi(this, !!t && t.fo);
        }, t.prototype.wo = function(t) {
            return this.getMetadata(t).next((function(t) {
                return t.byteSize;
            }));
        }, t.prototype.getMetadata = function(t) {
            return wi(t).get(Ci.key).next((function(t) {
                return k$1(!!t), t;
            }));
        }, t.prototype.ro = function(t, e) {
            return wi(t).put(Ci.key, e);
        }, 
        /**
         * Decodes `remoteDoc` and returns the document (or null, if the document
         * corresponds to the format used for sentinel deletes).
         */
        t.prototype.oo = function(t) {
            if (t) {
                var e = ei(this.serializer, t);
                return e instanceof _n && e.version.isEqual(z.min()) ? null : e;
            }
            return null;
        }, t;
    }(), mi = /** @class */ function(e) {
        /**
         * @param documentCache The IndexedDbRemoteDocumentCache to apply the changes to.
         * @param trackRemovals Whether to create sentinel deletes that can be tracked by
         * `getNewDocumentChanges()`.
         */
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).To = t, r.fo = n, 
            // A map of document sizes prior to applying the changes in this buffer.
            r.Eo = new q$1((function(t) {
                return t.toString();
            }), (function(t, e) {
                return t.isEqual(e);
            })), r;
        }
        return __extends(n, e), n.prototype.bi = function(t) {
            var e = this, n = [], r = 0, i = new pt((function(t, e) {
                return V$1(t.M(), e.M());
            }));
            return this.Ii.forEach((function(o, u) {
                var s = e.Eo.get(o);
                if (u.gi) {
                    var a = ni(e.To.serializer, u.gi, e.Ai(o));
                    i = i.add(o.path.S());
                    var c = Ii(a);
                    r += c - s, n.push(e.To.Ri(t, o, a));
                } else if (r -= s, e.fo) {
                    // In order to track removals, we store a "sentinel delete" in the
                    // RemoteDocumentCache. This entry is represented by a NoDocument
                    // with a version of 0 and ignored by `maybeDecodeDocument()` but
                    // preserved in `getNewDocumentChanges()`.
                    var h = ni(e.To.serializer, new _n(o, z.min()), e.Ai(o));
                    n.push(e.To.Ri(t, o, h));
                } else n.push(e.To.Vi(t, o));
            })), i.forEach((function(r) {
                n.push(e.To.Fi.Kr(t, r));
            })), n.push(this.To.updateMetadata(t, r)), or.xn(n);
        }, n.prototype.pi = function(t, e) {
            var n = this;
            // Record the size of everything we load from the cache so we can compute a delta later.
                    return this.To.ao(t, e).next((function(t) {
                return null === t ? (n.Eo.set(e, 0), null) : (n.Eo.set(e, t.size), t.gi);
            }));
        }, n.prototype.vi = function(t, e) {
            var n = this;
            // Record the size of everything we load from the cache so we can compute
            // a delta later.
                    return this.To.uo(t, e).next((function(t) {
                var e = t.ho;
                // Note: `getAllFromCache` returns two maps instead of a single map from
                // keys to `DocumentSizeEntry`s. This is to allow returning the
                // `NullableMaybeDocumentMap` directly, without a conversion.
                return t.lo.forEach((function(t, e) {
                    n.Eo.set(t, e);
                })), e;
            }));
        }, n;
    }(Rr);

    /**
     * Creates a new IndexedDbRemoteDocumentCache.
     *
     * @param serializer The document serializer.
     * @param indexManager The query indexes that need to be maintained.
     */
    /**
     * Handles the details of adding and updating documents in the IndexedDbRemoteDocumentCache.
     *
     * Unlike the MemoryRemoteDocumentChangeBuffer, the IndexedDb implementation computes the size
     * delta for all submitted changes. This avoids having to re-read all documents from IndexedDb
     * when we apply the changes.
     */ function wi(t) {
        return no.qn(t, Ci.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
     */ function bi(t) {
        return no.qn(t, Vi.store);
    }

    function _i(t) {
        return t.path.O();
    }

    /**
     * Retrusn an approximate size for the given document.
     */ function Ii(t) {
        var e;
        if (t.document) e = t.document; else if (t.unknownDocument) e = t.unknownDocument; else {
            if (!t.noDocument) throw S$1();
            e = t.noDocument;
        }
        return JSON.stringify(e).length;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An in-memory implementation of IndexManager.
     */ var Ei = /** @class */ function() {
        function t() {
            this.Io = new Ti;
        }
        return t.prototype.Kr = function(t, e) {
            return this.Io.add(e), or.resolve();
        }, t.prototype.ji = function(t, e) {
            return or.resolve(this.Io.getEntries(e));
        }, t;
    }(), Ti = /** @class */ function() {
        function t() {
            this.index = {};
        }
        // Returns false if the entry already existed.
            return t.prototype.add = function(t) {
            var e = t.C(), n = t.S(), r = this.index[e] || new pt(K$1.V), i = !r.has(n);
            return this.index[e] = r.add(n), i;
        }, t.prototype.has = function(t) {
            var e = t.C(), n = t.S(), r = this.index[e];
            return r && r.has(n);
        }, t.prototype.getEntries = function(t) {
            return (this.index[t] || new pt(K$1.V)).O();
        }, t;
    }(), Ni = /** @class */ function() {
        function t(t) {
            this.serializer = t;
        }
        /**
         * Performs database creation and schema upgrades.
         *
         * Note that in production, this method is only ever used to upgrade the schema
         * to SCHEMA_VERSION. Different values of toVersion are only used for testing
         * and local feature development.
         */    return t.prototype.createOrUpgrade = function(t, e, n, r) {
            var i = this;
            k$1(n < r && n >= 0 && r <= 11);
            var o = new hr("createOrUpgrade", e);
            n < 1 && r >= 1 && (function(t) {
                t.createObjectStore(Ai.store);
            }(t), function(t) {
                t.createObjectStore(Si.store, {
                    keyPath: Si.keyPath
                }), t.createObjectStore(ki.store, {
                    keyPath: ki.keyPath,
                    autoIncrement: !0
                }).createIndex(ki.userMutationsIndex, ki.userMutationsKeyPath, {
                    unique: !0
                }), t.createObjectStore(Di.store);
            }(t), qi(t), function(t) {
                t.createObjectStore(Vi.store);
            }(t));
            // Migration 2 to populate the targetGlobal object no longer needed since
            // migration 3 unconditionally clears it.
            var u = or.resolve();
            return n < 3 && r >= 3 && (
            // Brand new clients don't need to drop and recreate--only clients that
            // potentially have corrupt data.
            0 !== n && (function(t) {
                t.deleteObjectStore(Ri.store), t.deleteObjectStore(Li.store), t.deleteObjectStore(Mi.store);
            }(t), qi(t)), u = u.next((function() {
                /**
         * Creates the target global singleton row.
         *
         * @param {IDBTransaction} txn The version upgrade transaction for indexeddb
         */
                return function(t) {
                    var e = t.store(Mi.store), n = new Mi(
                    /*highestTargetId=*/ 0, 
                    /*lastListenSequenceNumber=*/ 0, z.min().P(), 
                    /*targetCount=*/ 0);
                    return e.put(Mi.key, n);
                }(o);
            }))), n < 4 && r >= 4 && (0 !== n && (
            // Schema version 3 uses auto-generated keys to generate globally unique
            // mutation batch IDs (this was previously ensured internally by the
            // client). To migrate to the new schema, we have to read all mutations
            // and write them back out. We preserve the existing batch IDs to guarantee
            // consistency with other object stores. Any further mutation batch IDs will
            // be auto-generated.
            u = u.next((function() {
                return function(t, e) {
                    return e.store(ki.store).Xn().next((function(n) {
                        t.deleteObjectStore(ki.store), t.createObjectStore(ki.store, {
                            keyPath: ki.keyPath,
                            autoIncrement: !0
                        }).createIndex(ki.userMutationsIndex, ki.userMutationsKeyPath, {
                            unique: !0
                        });
                        var r = e.store(ki.store), i = n.map((function(t) {
                            return r.put(t);
                        }));
                        return or.xn(i);
                    }));
                }(t, o);
            }))), u = u.next((function() {
                !function(t) {
                    t.createObjectStore(Fi.store, {
                        keyPath: Fi.keyPath
                    });
                }(t);
            }))), n < 5 && r >= 5 && (u = u.next((function() {
                return i.removeAcknowledgedMutations(o);
            }))), n < 6 && r >= 6 && (u = u.next((function() {
                return function(t) {
                    t.createObjectStore(Ci.store);
                }(t), i.addDocumentGlobal(o);
            }))), n < 7 && r >= 7 && (u = u.next((function() {
                return i.ensureSequenceNumbers(o);
            }))), n < 8 && r >= 8 && (u = u.next((function() {
                return i.createCollectionParentIndex(t, o);
            }))), n < 9 && r >= 9 && (u = u.next((function() {
                // Multi-Tab used to manage its own changelog, but this has been moved
                // to the DbRemoteDocument object store itself. Since the previous change
                // log only contained transient data, we can drop its object store.
                !function(t) {
                    t.objectStoreNames.contains("remoteDocumentChanges") && t.deleteObjectStore("remoteDocumentChanges");
                }(t), function(t) {
                    var e = t.objectStore(Vi.store);
                    e.createIndex(Vi.readTimeIndex, Vi.readTimeIndexPath, {
                        unique: !1
                    }), e.createIndex(Vi.collectionReadTimeIndex, Vi.collectionReadTimeIndexPath, {
                        unique: !1
                    });
                }(e);
            }))), n < 10 && r >= 10 && (u = u.next((function() {
                return i.rewriteCanonicalIds(o);
            }))), n < 11 && r >= 11 && (u = u.next((function() {
                !function(t) {
                    t.createObjectStore(ji.store, {
                        keyPath: ji.keyPath
                    });
                }(t), function(t) {
                    t.createObjectStore(Bi.store, {
                        keyPath: Bi.keyPath
                    });
                }(t);
            }))), u;
        }, t.prototype.addDocumentGlobal = function(t) {
            var e = 0;
            return t.store(Vi.store).ns((function(t, n) {
                e += Ii(n);
            })).next((function() {
                var n = new Ci(e);
                return t.store(Ci.store).put(Ci.key, n);
            }));
        }, t.prototype.removeAcknowledgedMutations = function(t) {
            var e = this, n = t.store(Si.store), r = t.store(ki.store);
            return n.Xn().next((function(n) {
                return or.forEach(n, (function(n) {
                    var i = IDBKeyRange.bound([ n.userId, -1 ], [ n.userId, n.lastAcknowledgedBatchId ]);
                    return r.Xn(ki.userMutationsIndex, i).next((function(r) {
                        return or.forEach(r, (function(r) {
                            k$1(r.userId === n.userId);
                            var i = si(e.serializer, r);
                            return pi(t, n.userId, i).next((function() {}));
                        }));
                    }));
                }));
            }));
        }, 
        /**
         * Ensures that every document in the remote document cache has a corresponding sentinel row
         * with a sequence number. Missing rows are given the most recently used sequence number.
         */
        t.prototype.ensureSequenceNumbers = function(t) {
            var e = t.store(Ri.store), n = t.store(Vi.store);
            return t.store(Mi.store).get(Mi.key).next((function(t) {
                var r = [];
                return n.ns((function(n, i) {
                    var o = new K$1(n), u = function(t) {
                        return [ 0, Jr(t) ];
                    }(o);
                    r.push(e.get(u).next((function(n) {
                        return n ? or.resolve() : function(n) {
                            return e.put(new Ri(0, Jr(n), t.highestListenSequenceNumber));
                        }(o);
                    })));
                })).next((function() {
                    return or.xn(r);
                }));
            }));
        }, t.prototype.createCollectionParentIndex = function(t, e) {
            // Create the index.
            t.createObjectStore(Ui.store, {
                keyPath: Ui.keyPath
            });
            var n = e.store(Ui.store), r = new Ti, i = function(t) {
                if (r.add(t)) {
                    var e = t.C(), i = t.S();
                    return n.put({
                        collectionId: e,
                        parent: Jr(i)
                    });
                }
            };
            // Helper to add an index entry iff we haven't already written it.
            // Index existing remote documents.
                    return e.store(Vi.store).ns({
                es: !0
            }, (function(t, e) {
                var n = new K$1(t);
                return i(n.S());
            })).next((function() {
                return e.store(Di.store).ns({
                    es: !0
                }, (function(t, e) {
                    t[0];
                    var n = t[1], r = (t[2], Zr(n));
                    return i(r.S());
                }));
            }));
        }, t.prototype.rewriteCanonicalIds = function(t) {
            var e = this, n = t.store(Li.store);
            return n.ns((function(t, r) {
                var i = ai(r), o = ci(e.serializer, i);
                return n.put(o);
            }));
        }, t;
    }(), xi = function(t, e) {
        this.seconds = t, this.nanoseconds = e;
    }, Ai = function(t, 
    /** Whether to allow shared access from multiple tabs. */
    e, n) {
        this.ownerId = t, this.allowTabSynchronization = e, this.leaseTimestampMs = n;
    };

    /**
     * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
     * Also used for in-memory caching by IndexedDbIndexManager and initial index population
     * in indexeddb_schema.ts
     */
    /**
     * Name of the IndexedDb object store.
     *
     * Note that the name 'owner' is chosen to ensure backwards compatibility with
     * older clients that only supported single locked access to the persistence
     * layer.
     */
    Ai.store = "owner", 
    /**
         * The key string used for the single object that exists in the
         * DbPrimaryClient store.
         */
    Ai.key = "owner";

    var Si = function(
    /**
         * The normalized user ID to which this queue belongs.
         */
    t, 
    /**
         * An identifier for the highest numbered batch that has been acknowledged
         * by the server. All MutationBatches in this queue with batchIds less
         * than or equal to this value are considered to have been acknowledged by
         * the server.
         *
         * NOTE: this is deprecated and no longer used by the code.
         */
    e, 
    /**
         * A stream token that was previously sent by the server.
         *
         * See StreamingWriteRequest in datastore.proto for more details about
         * usage.
         *
         * After sending this token, earlier tokens may not be used anymore so
         * only a single stream token is retained.
         *
         * NOTE: this is deprecated and no longer used by the code.
         */
    n) {
        this.userId = t, this.lastAcknowledgedBatchId = e, this.lastStreamToken = n;
    };

    /** Name of the IndexedDb object store.  */ Si.store = "mutationQueues", 
    /** Keys are automatically assigned via the userId property. */
    Si.keyPath = "userId";

    /**
     * An object to be stored in the 'mutations' store in IndexedDb.
     *
     * Represents a batch of user-level mutations intended to be sent to the server
     * in a single write. Each user-level batch gets a separate DbMutationBatch
     * with a new batchId.
     */
    var ki = function(
    /**
         * The normalized user ID to which this batch belongs.
         */
    t, 
    /**
         * An identifier for this batch, allocated using an auto-generated key.
         */
    e, 
    /**
         * The local write time of the batch, stored as milliseconds since the
         * epoch.
         */
    n, 
    /**
         * A list of "mutations" that represent a partial base state from when this
         * write batch was initially created. During local application of the write
         * batch, these baseMutations are applied prior to the real writes in order
         * to override certain document fields from the remote document cache. This
         * is necessary in the case of non-idempotent writes (e.g. `increment()`
         * transforms) to make sure that the local view of the modified documents
         * doesn't flicker if the remote document cache receives the result of the
         * non-idempotent write before the write is removed from the queue.
         *
         * These mutations are never sent to the backend.
         */
    r, 
    /**
         * A list of mutations to apply. All mutations will be applied atomically.
         *
         * Mutations are serialized via toMutation().
         */
    i) {
        this.userId = t, this.batchId = e, this.localWriteTimeMs = n, this.baseMutations = r, 
        this.mutations = i;
    };

    /** Name of the IndexedDb object store.  */ ki.store = "mutations", 
    /** Keys are automatically assigned via the userId, batchId properties. */
    ki.keyPath = "batchId", 
    /** The index name for lookup of mutations by user. */
    ki.userMutationsIndex = "userMutationsIndex", 
    /** The user mutations index is keyed by [userId, batchId] pairs. */
    ki.userMutationsKeyPath = [ "userId", "batchId" ];

    var Di = /** @class */ function() {
        function t() {}
        /**
         * Creates a [userId] key for use in the DbDocumentMutations index to iterate
         * over all of a user's document mutations.
         */    return t.prefixForUser = function(t) {
            return [ t ];
        }, 
        /**
         * Creates a [userId, encodedPath] key for use in the DbDocumentMutations
         * index to iterate over all at document mutations for a given path or lower.
         */
        t.prefixForPath = function(t, e) {
            return [ t, Jr(e) ];
        }, 
        /**
         * Creates a full index key of [userId, encodedPath, batchId] for inserting
         * and deleting into the DbDocumentMutations index.
         */
        t.key = function(t, e, n) {
            return [ t, Jr(e), n ];
        }, t;
    }();

    Di.store = "documentMutations", 
    /**
         * Because we store all the useful information for this store in the key,
         * there is no useful information to store as the value. The raw (unencoded)
         * path cannot be stored because IndexedDb doesn't store prototype
         * information.
         */
    Di.PLACEHOLDER = new Di;

    var Oi = function(t, e) {
        this.path = t, this.readTime = e;
    }, Pi = function(t, e) {
        this.path = t, this.version = e;
    }, Vi = 
    // TODO: We are currently storing full document keys almost three times
    // (once as part of the primary key, once - partly - as `parentPath` and once
    // inside the encoded documents). During our next migration, we should
    // rewrite the primary key as parentPath + document ID which would allow us
    // to drop one value.
    function(
    /**
         * Set to an instance of DbUnknownDocument if the data for a document is
         * not known, but it is known that a document exists at the specified
         * version (e.g. it had a successful update applied to it)
         */
    t, 
    /**
         * Set to an instance of a DbNoDocument if it is known that no document
         * exists.
         */
    e, 
    /**
         * Set to an instance of a Document if there's a cached version of the
         * document.
         */
    n, 
    /**
         * Documents that were written to the remote document store based on
         * a write acknowledgment are marked with `hasCommittedMutations`. These
         * documents are potentially inconsistent with the backend's copy and use
         * the write's commit version as their document version.
         */
    r, 
    /**
         * When the document was read from the backend. Undefined for data written
         * prior to schema version 9.
         */
    i, 
    /**
         * The path of the collection this document is part of. Undefined for data
         * written prior to schema version 9.
         */
    o) {
        this.unknownDocument = t, this.noDocument = e, this.document = n, this.hasCommittedMutations = r, 
        this.readTime = i, this.parentPath = o;
    };

    /**
     * Represents a document that is known to exist but whose data is unknown.
     * Stored in IndexedDb as part of a DbRemoteDocument object.
     */ Vi.store = "remoteDocuments", 
    /**
         * An index that provides access to all entries sorted by read time (which
         * corresponds to the last modification time of each row).
         *
         * This index is used to provide a changelog for Multi-Tab.
         */
    Vi.readTimeIndex = "readTimeIndex", Vi.readTimeIndexPath = "readTime", 
    /**
         * An index that provides access to documents in a collection sorted by read
         * time.
         *
         * This index is used to allow the RemoteDocumentCache to fetch newly changed
         * documents in a collection.
         */
    Vi.collectionReadTimeIndex = "collectionReadTimeIndex", Vi.collectionReadTimeIndexPath = [ "parentPath", "readTime" ];

    /**
     * Contains a single entry that has metadata about the remote document cache.
     */
    var Ci = 
    /**
         * @param byteSize Approximately the total size in bytes of all the documents in the document
         * cache.
         */
    function(t) {
        this.byteSize = t;
    };

    Ci.store = "remoteDocumentGlobal", Ci.key = "remoteDocumentGlobalKey";

    var Li = function(
    /**
         * An auto-generated sequential numeric identifier for the query.
         *
         * Queries are stored using their canonicalId as the key, but these
         * canonicalIds can be quite long so we additionally assign a unique
         * queryId which can be used by referenced data structures (e.g.
         * indexes) to minimize the on-disk cost.
         */
    t, 
    /**
         * The canonical string representing this query. This is not unique.
         */
    e, 
    /**
         * The last readTime received from the Watch Service for this query.
         *
         * This is the same value as TargetChange.read_time in the protos.
         */
    n, 
    /**
         * An opaque, server-assigned token that allows watching a query to be
         * resumed after disconnecting without retransmitting all the data
         * that matches the query. The resume token essentially identifies a
         * point in time from which the server should resume sending results.
         *
         * This is related to the snapshotVersion in that the resumeToken
         * effectively also encodes that value, but the resumeToken is opaque
         * and sometimes encodes additional information.
         *
         * A consequence of this is that the resumeToken should be used when
         * asking the server to reason about where this client is in the watch
         * stream, but the client should use the snapshotVersion for its own
         * purposes.
         *
         * This is the same value as TargetChange.resume_token in the protos.
         */
    r, 
    /**
         * A sequence number representing the last time this query was
         * listened to, used for garbage collection purposes.
         *
         * Conventionally this would be a timestamp value, but device-local
         * clocks are unreliable and they must be able to create new listens
         * even while disconnected. Instead this should be a monotonically
         * increasing number that's incremented on each listen call.
         *
         * This is different from the queryId since the queryId is an
         * immutable identifier assigned to the Query on first use while
         * lastListenSequenceNumber is updated every time the query is
         * listened to.
         */
    i, 
    /**
         * Denotes the maximum snapshot version at which the associated query view
         * contained no limbo documents.  Undefined for data written prior to
         * schema version 9.
         */
    o, 
    /**
         * The query for this target.
         *
         * Because canonical ids are not unique we must store the actual query. We
         * use the proto to have an object we can persist without having to
         * duplicate translation logic to and from a `Query` object.
         */
    u) {
        this.targetId = t, this.canonicalId = e, this.readTime = n, this.resumeToken = r, 
        this.lastListenSequenceNumber = i, this.lastLimboFreeSnapshotVersion = o, this.query = u;
    };

    Li.store = "targets", 
    /** Keys are automatically assigned via the targetId property. */
    Li.keyPath = "targetId", 
    /** The name of the queryTargets index. */
    Li.queryTargetsIndexName = "queryTargetsIndex", 
    /**
         * The index of all canonicalIds to the targets that they match. This is not
         * a unique mapping because canonicalId does not promise a unique name for all
         * possible queries, so we append the targetId to make the mapping unique.
         */
    Li.queryTargetsKeyPath = [ "canonicalId", "targetId" ];

    /**
     * An object representing an association between a target and a document, or a
     * sentinel row marking the last sequence number at which a document was used.
     * Each document cached must have a corresponding sentinel row before lru
     * garbage collection is enabled.
     *
     * The target associations and sentinel rows are co-located so that orphaned
     * documents and their sequence numbers can be identified efficiently via a scan
     * of this store.
     */
    var Ri = function(
    /**
         * The targetId identifying a target or 0 for a sentinel row.
         */
    t, 
    /**
         * The path to the document, as encoded in the key.
         */
    e, 
    /**
         * If this is a sentinel row, this should be the sequence number of the last
         * time the document specified by `path` was used. Otherwise, it should be
         * `undefined`.
         */
    n) {
        this.targetId = t, this.path = e, this.sequenceNumber = n;
    };

    /** Name of the IndexedDb object store.  */ Ri.store = "targetDocuments", 
    /** Keys are automatically assigned via the targetId, path properties. */
    Ri.keyPath = [ "targetId", "path" ], 
    /** The index name for the reverse index. */
    Ri.documentTargetsIndex = "documentTargetsIndex", 
    /** We also need to create the reverse index for these properties. */
    Ri.documentTargetsKeyPath = [ "path", "targetId" ];

    /**
     * A record of global state tracked across all Targets, tracked separately
     * to avoid the need for extra indexes.
     *
     * This should be kept in-sync with the proto used in the iOS client.
     */
    var Mi = function(
    /**
         * The highest numbered target id across all targets.
         *
         * See DbTarget.targetId.
         */
    t, 
    /**
         * The highest numbered lastListenSequenceNumber across all targets.
         *
         * See DbTarget.lastListenSequenceNumber.
         */
    e, 
    /**
         * A global snapshot version representing the last consistent snapshot we
         * received from the backend. This is monotonically increasing and any
         * snapshots received from the backend prior to this version (e.g. for
         * targets resumed with a resumeToken) should be suppressed (buffered)
         * until the backend has caught up to this snapshot version again. This
         * prevents our cache from ever going backwards in time.
         */
    n, 
    /**
         * The number of targets persisted.
         */
    r) {
        this.highestTargetId = t, this.highestListenSequenceNumber = e, this.lastRemoteSnapshotVersion = n, 
        this.targetCount = r;
    };

    /**
     * The key string used for the single object that exists in the
     * DbTargetGlobal store.
     */ Mi.key = "targetGlobalKey", Mi.store = "targetGlobal";

    /**
     * An object representing an association between a Collection id (e.g. 'messages')
     * to a parent path (e.g. '/chats/123') that contains it as a (sub)collection.
     * This is used to efficiently find all collections to query when performing
     * a Collection Group query.
     */
    var Ui = function(
    /**
         * The collectionId (e.g. 'messages')
         */
    t, 
    /**
         * The path to the parent (either a document location or an empty path for
         * a root-level collection).
         */
    e) {
        this.collectionId = t, this.parent = e;
    };

    /** Name of the IndexedDb object store. */ function qi(t) {
        t.createObjectStore(Ri.store, {
            keyPath: Ri.keyPath
        }).createIndex(Ri.documentTargetsIndex, Ri.documentTargetsKeyPath, {
            unique: !0
        }), 
        // NOTE: This is unique only because the TargetId is the suffix.
        t.createObjectStore(Li.store, {
            keyPath: Li.keyPath
        }).createIndex(Li.queryTargetsIndexName, Li.queryTargetsKeyPath, {
            unique: !0
        }), t.createObjectStore(Mi.store);
    }

    Ui.store = "collectionParents", 
    /** Keys are automatically assigned via the collectionId, parent properties. */
    Ui.keyPath = [ "collectionId", "parent" ];

    var Fi = function(
    // Note: Previous schema versions included a field
    // "lastProcessedDocumentChangeId". Don't use anymore.
    /** The auto-generated client id assigned at client startup. */
    t, 
    /** The last time this state was updated. */
    e, 
    /** Whether the client's network connection is enabled. */
    n, 
    /** Whether this client is running in a foreground tab. */
    r) {
        this.clientId = t, this.updateTimeMs = e, this.networkEnabled = n, this.inForeground = r;
    };

    /** Name of the IndexedDb object store. */ Fi.store = "clientMetadata", 
    /** Keys are automatically assigned via the clientId properties. */
    Fi.keyPath = "clientId";

    var ji = function(
    /** The ID of the loaded bundle. */
    t, 
    /** The create time of the loaded bundle. */
    e, 
    /** The schema version of the loaded bundle. */
    n) {
        this.bundleId = t, this.createTime = e, this.version = n;
    };

    /** Name of the IndexedDb object store. */ ji.store = "bundles", ji.keyPath = "bundleId";

    var Bi = function(
    /** The name of the query. */
    t, 
    /** The read time of the results saved in the bundle from the named query. */
    e, 
    /** The query saved in the bundle. */
    n) {
        this.name = t, this.readTime = e, this.bundledQuery = n;
    };

    /** Name of the IndexedDb object store. */ Bi.store = "namedQueries", Bi.keyPath = "name";

    var zi = __spreadArrays(__spreadArrays(__spreadArrays(__spreadArrays([ Si.store, ki.store, Di.store, Vi.store, Li.store, Ai.store, Mi.store, Ri.store ], [ Fi.store ]), [ Ci.store ]), [ Ui.store ]), [ ji.store, Bi.store ]), Gi = /** @class */ function() {
        function t(t) {
            this.serializer = t;
        }
        return t.prototype.mo = function(t, e) {
            return Ki(t).get(e).next((function(t) {
                if (t) return {
                    id: (e = t).bundleId,
                    createTime: ui(e.createTime),
                    version: e.version
                };
                /** Encodes a DbBundle to a Bundle. */            var e;
                /** Encodes a BundleMetadata to a DbBundle. */        }));
        }, t.prototype.Ao = function(t, e) {
            return Ki(t).put({
                bundleId: (n = e).id,
                createTime: oi(le(n.createTime)),
                version: n.version
            });
            var n;
            /** Encodes a DbNamedQuery to a NamedQuery. */    }, t.prototype.Ro = function(t, e) {
            return Qi(t).get(e).next((function(t) {
                if (t) return {
                    name: (e = t).name,
                    query: hi(e.bundledQuery),
                    readTime: ui(e.readTime)
                };
                var e;
                /** Encodes a NamedQuery from a bundle proto to a DbNamedQuery. */        }));
        }, t.prototype.Po = function(t, e) {
            return Qi(t).put(function(t) {
                return {
                    name: t.name,
                    readTime: oi(le(t.readTime)),
                    bundledQuery: t.bundledQuery
                };
            }(e));
        }, t;
    }();

    // V2 is no longer usable (see comment at top of file)
    // Visible for testing
    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Helper to get a typed SimpleDbStore for the bundles object store.
     */
    function Ki(t) {
        return no.qn(t, ji.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the namedQueries object store.
     */ function Qi(t) {
        return no.qn(t, Bi.store);
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A persisted implementation of IndexManager.
     */ var Wi = /** @class */ function() {
        function t() {
            /**
             * An in-memory copy of the index entries we've already written since the SDK
             * launched. Used to avoid re-writing the same entry repeatedly.
             *
             * This is *NOT* a complete cache of what's in persistence and so can never be used to
             * satisfy reads.
             */
            this.Vo = new Ti;
        }
        /**
         * Adds a new entry to the collection parent index.
         *
         * Repeated calls for the same collectionPath should be avoided within a
         * transaction as IndexedDbIndexManager only caches writes once a transaction
         * has been committed.
         */    return t.prototype.Kr = function(t, e) {
            var n = this;
            if (!this.Vo.has(e)) {
                var r = e.C(), i = e.S();
                t.Di((function() {
                    // Add the collection to the in memory cache only if the transaction was
                    // successfully committed.
                    n.Vo.add(e);
                }));
                var o = {
                    collectionId: r,
                    parent: Jr(i)
                };
                return Yi(t).put(o);
            }
            return or.resolve();
        }, t.prototype.ji = function(t, e) {
            var n = [], r = IDBKeyRange.bound([ e, "" ], [ L$1(e), "" ], 
            /*lowerOpen=*/ !1, 
            /*upperOpen=*/ !0);
            return Yi(t).Xn(r).next((function(t) {
                for (var r = 0, i = t; r < i.length; r++) {
                    var o = i[r];
                    // This collectionId guard shouldn't be necessary (and isn't as long
                    // as we're running in a real browser), but there's a bug in
                    // indexeddbshim that breaks our range in our tests running in node:
                    // https://github.com/axemclion/IndexedDBShim/issues/334
                                    if (o.collectionId !== e) break;
                    n.push(Zr(o.parent));
                }
                return n;
            }));
        }, t;
    }();

    /**
     * Helper to get a typed SimpleDbStore for the collectionParents
     * document store.
     */ function Yi(t) {
        return no.qn(t, Ui.store);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Offset to ensure non-overlapping target ids. */
    /**
     * Generates monotonically increasing target IDs for sending targets to the
     * watch stream.
     *
     * The client constructs two generators, one for the target cache, and one for
     * for the sync engine (to generate limbo documents targets). These
     * generators produce non-overlapping IDs (by using even and odd IDs
     * respectively).
     *
     * By separating the target ID space, the query cache can generate target IDs
     * that persist across client restarts, while sync engine can independently
     * generate in-memory target IDs that are transient and can be reused after a
     * restart.
     */ var Hi = /** @class */ function() {
        function t(t) {
            this.yo = t;
        }
        return t.prototype.next = function() {
            return this.yo += 2, this.yo;
        }, t.po = function() {
            // The target cache generator must return '2' in its first call to `next()`
            // as there is no differentiation in the protocol layer between an unset
            // number and the number '0'. If we were to sent a target with target ID
            // '0', the backend would consider it unset and replace it with its own ID.
            return new t(0);
        }, t.vo = function() {
            // Sync engine assigns target IDs for limbo document detection.
            return new t(-1);
        }, t;
    }(), Ji = /** @class */ function() {
        function t(t, e) {
            this.Lr = t, this.serializer = e;
        }
        // PORTING NOTE: We don't cache global metadata for the target cache, since
        // some of it (in particular `highestTargetId`) can be modified by secondary
        // tabs. We could perhaps be more granular (and e.g. still cache
        // `lastRemoteSnapshotVersion` in memory) but for simplicity we currently go
        // to IndexedDb whenever we need to read metadata. We can revisit if it turns
        // out to have a meaningful performance impact.
            return t.prototype.bo = function(t) {
            var e = this;
            return this.So(t).next((function(n) {
                var r = new Hi(n.highestTargetId);
                return n.highestTargetId = r.next(), e.Do(t, n).next((function() {
                    return n.highestTargetId;
                }));
            }));
        }, t.prototype.Co = function(t) {
            return this.So(t).next((function(t) {
                return z.m(new B(t.lastRemoteSnapshotVersion.seconds, t.lastRemoteSnapshotVersion.nanoseconds));
            }));
        }, t.prototype.No = function(t) {
            return this.So(t).next((function(t) {
                return t.highestListenSequenceNumber;
            }));
        }, t.prototype.xo = function(t, e, n) {
            var r = this;
            return this.So(t).next((function(i) {
                return i.highestListenSequenceNumber = e, n && (i.lastRemoteSnapshotVersion = n.P()), 
                e > i.highestListenSequenceNumber && (i.highestListenSequenceNumber = e), r.Do(t, i);
            }));
        }, t.prototype.Fo = function(t, e) {
            var n = this;
            return this.Oo(t, e).next((function() {
                return n.So(t).next((function(r) {
                    return r.targetCount += 1, n.Mo(e, r), n.Do(t, r);
                }));
            }));
        }, t.prototype.ko = function(t, e) {
            return this.Oo(t, e);
        }, t.prototype.$o = function(t, e) {
            var n = this;
            return this.Lo(t, e.targetId).next((function() {
                return Xi(t).delete(e.targetId);
            })).next((function() {
                return n.So(t);
            })).next((function(e) {
                return k$1(e.targetCount > 0), e.targetCount -= 1, n.Do(t, e);
            }));
        }, 
        /**
         * Drops any targets with sequence number less than or equal to the upper bound, excepting those
         * present in `activeTargetIds`. Document associations for the removed targets are also removed.
         * Returns the number of targets removed.
         */
        t.prototype.Nr = function(t, e, n) {
            var r = this, i = 0, o = [];
            return Xi(t).ns((function(u, s) {
                var a = ai(s);
                a.sequenceNumber <= e && null === n.get(a.targetId) && (i++, o.push(r.$o(t, a)));
            })).next((function() {
                return or.xn(o);
            })).next((function() {
                return i;
            }));
        }, 
        /**
         * Call provided function with each `TargetData` that we have cached.
         */
        t.prototype.De = function(t, e) {
            return Xi(t).ns((function(t, n) {
                var r = ai(n);
                e(r);
            }));
        }, t.prototype.So = function(t) {
            return $i(t).get(Mi.key).next((function(t) {
                return k$1(null !== t), t;
            }));
        }, t.prototype.Do = function(t, e) {
            return $i(t).put(Mi.key, e);
        }, t.prototype.Oo = function(t, e) {
            return Xi(t).put(ci(this.serializer, e));
        }, 
        /**
         * In-place updates the provided metadata to account for values in the given
         * TargetData. Saving is done separately. Returns true if there were any
         * changes to the metadata.
         */
        t.prototype.Mo = function(t, e) {
            var n = !1;
            return t.targetId > e.highestTargetId && (e.highestTargetId = t.targetId, n = !0), 
            t.sequenceNumber > e.highestListenSequenceNumber && (e.highestListenSequenceNumber = t.sequenceNumber, 
            n = !0), n;
        }, t.prototype.Bo = function(t) {
            return this.So(t).next((function(t) {
                return t.targetCount;
            }));
        }, t.prototype.qo = function(t, e) {
            // Iterating by the canonicalId may yield more than one result because
            // canonicalId values are not required to be unique per target. This query
            // depends on the queryTargets index to be efficient.
            var n = tt(e), r = IDBKeyRange.bound([ n, Number.NEGATIVE_INFINITY ], [ n, Number.POSITIVE_INFINITY ]), i = null;
            return Xi(t).ns({
                range: r,
                index: Li.queryTargetsIndexName
            }, (function(t, n, r) {
                var o = ai(n);
                // After finding a potential match, check that the target is
                // actually equal to the requested target.
                            et(e, o.target) && (i = o, r.done());
            })).next((function() {
                return i;
            }));
        }, t.prototype.Uo = function(t, e, n) {
            var r = this, i = [], o = Zi(t);
            // PORTING NOTE: The reverse index (documentsTargets) is maintained by
            // IndexedDb.
                    return e.forEach((function(e) {
                var u = Jr(e.path);
                i.push(o.put(new Ri(n, u))), i.push(r.Lr.Qo(t, n, e));
            })), or.xn(i);
        }, t.prototype.Ko = function(t, e, n) {
            var r = this, i = Zi(t);
            // PORTING NOTE: The reverse index (documentsTargets) is maintained by
            // IndexedDb.
                    return or.forEach(e, (function(e) {
                var o = Jr(e.path);
                return or.xn([ i.delete([ n, o ]), r.Lr.Wo(t, n, e) ]);
            }));
        }, t.prototype.Lo = function(t, e) {
            var n = Zi(t), r = IDBKeyRange.bound([ e ], [ e + 1 ], 
            /*lowerOpen=*/ !1, 
            /*upperOpen=*/ !0);
            return n.delete(r);
        }, t.prototype.jo = function(t, e) {
            var n = IDBKeyRange.bound([ e ], [ e + 1 ], 
            /*lowerOpen=*/ !1, 
            /*upperOpen=*/ !0), r = Zi(t), i = It();
            return r.ns({
                range: n,
                es: !0
            }, (function(t, e, n) {
                var r = Zr(t[1]), o = new Y$1(r);
                i = i.add(o);
            })).next((function() {
                return i;
            }));
        }, t.prototype.so = function(t, e) {
            var n = Jr(e.path), r = IDBKeyRange.bound([ n ], [ L$1(n) ], 
            /*lowerOpen=*/ !1, 
            /*upperOpen=*/ !0), i = 0;
            return Zi(t).ns({
                index: Ri.documentTargetsIndex,
                es: !0,
                range: r
            }, (function(t, e, n) {
                var r = t[0];
                // Having a sentinel row for a document does not count as containing that document;
                // For the target cache, containing the document means the document is part of some
                // target.
                            t[1];
                0 !== r && (i++, n.done());
            })).next((function() {
                return i > 0;
            }));
        }, 
        /**
         * Looks up a TargetData entry by target ID.
         *
         * @param targetId The target ID of the TargetData entry to look up.
         * @return The cached TargetData entry, or null if the cache has no entry for
         * the target.
         */
        // PORTING NOTE: Multi-tab only.
        t.prototype.qe = function(t, e) {
            return Xi(t).get(e).next((function(t) {
                return t ? ai(t) : null;
            }));
        }, t;
    }();

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Helper to get a typed SimpleDbStore for the queries object store.
     */
    function Xi(t) {
        return no.qn(t, Li.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the target globals object store.
     */ function $i(t) {
        return no.qn(t, Mi.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the document target object store.
     */ function Zi(t) {
        return no.qn(t, Ri.store);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var to = "Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.", eo = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).Xr = t, r.Go = n, r;
        }
        return __extends(n, e), n;
    }(Fr), no = /** @class */ function() {
        function t(
        /**
         * Whether to synchronize the in-memory state of multiple tabs and share
         * access to local persistence.
         */
        e, n, r, i, o, u, s, a, c, 
        /**
         * If set to true, forcefully obtains database access. Existing tabs will
         * no longer be able to access IndexedDB.
         */
        h) {
            if (this.allowTabSynchronization = e, this.persistenceKey = n, this.clientId = r, 
            this.ln = o, this.window = u, this.document = s, this.zo = c, this.Ho = h, this.Jo = null, 
            this.Yo = !1, this.isPrimary = !1, this.networkEnabled = !0, 
            /** Our window.unload handler, if registered. */
            this.Xo = null, this.inForeground = !1, 
            /** Our 'visibilitychange' listener if registered. */
            this.Zo = null, 
            /** The client metadata refresh task. */
            this.ta = null, 
            /** The last time we garbage collected the client metadata object store. */
            this.ea = Number.NEGATIVE_INFINITY, 
            /** A listener to notify on primary state changes. */
            this.na = function(t) {
                return Promise.resolve();
            }, !t.kn()) throw new j(F$1.UNIMPLEMENTED, "This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");
            this.Lr = new oo(this, i), this.sa = n + "main", this.serializer = new ti(a), this.ia = new ur(this.sa, 11, new Ni(this.serializer)), 
            this.ra = new Ji(this.Lr, this.serializer), this.Fi = new Wi, this.Ni = function(t, e) {
                return new gi(t, e);
            }(this.serializer, this.Fi), this.oa = new Gi(this.serializer), this.window && this.window.localStorage ? this.aa = this.window.localStorage : (this.aa = null, 
            !1 === h && N$1("IndexedDbPersistence", "LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."));
        }
        return t.qn = function(t, e) {
            if (t instanceof eo) return ur.qn(t.Xr, e);
            throw S$1();
        }, 
        /**
         * Attempt to start IndexedDb persistence.
         *
         * @return {Promise<void>} Whether persistence was enabled.
         */
        t.prototype.start = function() {
            var t = this;
            // NOTE: This is expected to fail sometimes (in the case of another tab
            // already having the persistence lock), so it's the first thing we should
            // do.
                    return this.ca().then((function() {
                if (!t.isPrimary && !t.allowTabSynchronization) 
                // Fail `start()` if `synchronizeTabs` is disabled and we cannot
                // obtain the primary lease.
                throw new j(F$1.FAILED_PRECONDITION, to);
                return t.ua(), t.ha(), t.la(), t.runTransaction("getHighestListenSequenceNumber", "readonly", (function(e) {
                    return t.ra.No(e);
                }));
            })).then((function(e) {
                t.Jo = new zr(e, t.zo);
            })).then((function() {
                t.Yo = !0;
            })).catch((function(e) {
                return t.ia && t.ia.close(), Promise.reject(e);
            }));
        }, 
        /**
         * Registers a listener that gets called when the primary state of the
         * instance changes. Upon registering, this listener is invoked immediately
         * with the current primary state.
         *
         * PORTING NOTE: This is only used for Web multi-tab.
         */
        t.prototype._a = function(t) {
            var r = this;
            return this.na = function(i) {
                return __awaiter(r, void 0, void 0, (function() {
                    return __generator(this, (function(e) {
                        return this.yr ? [ 2 /*return*/ , t(i) ] : [ 2 /*return*/ ];
                    }));
                }));
            }, t(this.isPrimary);
        }, 
        /**
         * Registers a listener that gets called when the database receives a
         * version change event indicating that it has deleted.
         *
         * PORTING NOTE: This is only used for Web multi-tab.
         */
        t.prototype.fa = function(t) {
            var r = this;
            this.ia.Kn((function(i) {
                return __awaiter(r, void 0, void 0, (function() {
                    return __generator(this, (function(e) {
                        switch (e.label) {
                          case 0:
                            return null === i.newVersion ? [ 4 /*yield*/ , t() ] : [ 3 /*break*/ , 2 ];

                          case 1:
                            e.sent(), e.label = 2;

                          case 2:
                            return [ 2 /*return*/ ];
                        }
                    }));
                }));
            }));
        }, 
        /**
         * Adjusts the current network state in the client's metadata, potentially
         * affecting the primary lease.
         *
         * PORTING NOTE: This is only used for Web multi-tab.
         */
        t.prototype.da = function(t) {
            var r = this;
            this.networkEnabled !== t && (this.networkEnabled = t, 
            // Schedule a primary lease refresh for immediate execution. The eventual
            // lease update will be propagated via `primaryStateListener`.
            this.ln.fs((function() {
                return __awaiter(r, void 0, void 0, (function() {
                    return __generator(this, (function(t) {
                        switch (t.label) {
                          case 0:
                            return this.yr ? [ 4 /*yield*/ , this.ca() ] : [ 3 /*break*/ , 2 ];

                          case 1:
                            t.sent(), t.label = 2;

                          case 2:
                            return [ 2 /*return*/ ];
                        }
                    }));
                }));
            })));
        }, 
        /**
         * Updates the client metadata in IndexedDb and attempts to either obtain or
         * extend the primary lease for the local client. Asynchronously notifies the
         * primary state listener if the client either newly obtained or released its
         * primary lease.
         */
        t.prototype.ca = function() {
            var t = this;
            return this.runTransaction("updateClientMetadataAndTryBecomePrimary", "readwrite", (function(e) {
                return io(e).put(new Fi(t.clientId, Date.now(), t.networkEnabled, t.inForeground)).next((function() {
                    if (t.isPrimary) return t.wa(e).next((function(e) {
                        e || (t.isPrimary = !1, t.ln.Ss((function() {
                            return t.na(!1);
                        })));
                    }));
                })).next((function() {
                    return t.Ta(e);
                })).next((function(n) {
                    return t.isPrimary && !n ? t.Ea(e).next((function() {
                        return !1;
                    })) : !!n && t.Ia(e).next((function() {
                        return !0;
                    }));
                }));
            })).catch((function(e) {
                if (cr(e)) 
                // Proceed with the existing state. Any subsequent access to
                // IndexedDB will verify the lease.
                return T$1("IndexedDbPersistence", "Failed to extend owner lease: ", e), t.isPrimary;
                if (!t.allowTabSynchronization) throw e;
                return T$1("IndexedDbPersistence", "Releasing owner lease after error during lease refresh", e), 
                /* isPrimary= */ !1;
            })).then((function(e) {
                t.isPrimary !== e && t.ln.Ss((function() {
                    return t.na(e);
                })), t.isPrimary = e;
            }));
        }, t.prototype.wa = function(t) {
            var e = this;
            return ro(t).get(Ai.key).next((function(t) {
                return or.resolve(e.ma(t));
            }));
        }, t.prototype.Aa = function(t) {
            return io(t).delete(this.clientId);
        }, 
        /**
         * If the garbage collection threshold has passed, prunes the
         * RemoteDocumentChanges and the ClientMetadata store based on the last update
         * time of all clients.
         */
        t.prototype.Ra = function() {
            return __awaiter(this, void 0, void 0, (function() {
                var e, r, i, o, u = this;
                return __generator(this, (function(n) {
                    switch (n.label) {
                      case 0:
                        return !this.isPrimary || this.Pa(this.ea, 18e5) ? [ 3 /*break*/ , 2 ] : (this.ea = Date.now(), 
                        [ 4 /*yield*/ , this.runTransaction("maybeGarbageCollectMultiClientState", "readwrite-primary", (function(e) {
                            var n = t.qn(e, Fi.store);
                            return n.Xn().next((function(t) {
                                var e = u.ga(t, 18e5), r = t.filter((function(t) {
                                    return -1 === e.indexOf(t);
                                }));
                                // Delete metadata for clients that are no longer considered active.
                                                            return or.forEach(r, (function(t) {
                                    return n.delete(t.clientId);
                                })).next((function() {
                                    return r;
                                }));
                            }));
                        })).catch((function() {
                            return [];
                        })) ]);

                      case 1:
                        // Delete potential leftover entries that may continue to mark the
                        // inactive clients as zombied in LocalStorage.
                        // Ideally we'd delete the IndexedDb and LocalStorage zombie entries for
                        // the client atomically, but we can't. So we opt to delete the IndexedDb
                        // entries first to avoid potentially reviving a zombied client.
                        if (e = n.sent(), this.aa) for (r = 0, i = e; r < i.length; r++) o = i[r], this.aa.removeItem(this.Va(o.clientId));
                        n.label = 2;

                      case 2:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Schedules a recurring timer to update the client metadata and to either
         * extend or acquire the primary lease if the client is eligible.
         */
        t.prototype.la = function() {
            var t = this;
            this.ta = this.ln.Pn("client_metadata_refresh" /* ClientMetadataRefresh */ , 4e3, (function() {
                return t.ca().then((function() {
                    return t.Ra();
                })).then((function() {
                    return t.la();
                }));
            }));
        }, 
        /** Checks whether `client` is the local client. */ t.prototype.ma = function(t) {
            return !!t && t.ownerId === this.clientId;
        }, 
        /**
         * Evaluate the state of all active clients and determine whether the local
         * client is or can act as the holder of the primary lease. Returns whether
         * the client is eligible for the lease, but does not actually acquire it.
         * May return 'false' even if there is no active leaseholder and another
         * (foreground) client should become leaseholder instead.
         */
        t.prototype.Ta = function(t) {
            var e = this;
            return this.Ho ? or.resolve(!0) : ro(t).get(Ai.key).next((function(n) {
                // A client is eligible for the primary lease if:
                // - its network is enabled and the client's tab is in the foreground.
                // - its network is enabled and no other client's tab is in the
                //   foreground.
                // - every clients network is disabled and the client's tab is in the
                //   foreground.
                // - every clients network is disabled and no other client's tab is in
                //   the foreground.
                // - the `forceOwningTab` setting was passed in.
                if (null !== n && e.Pa(n.leaseTimestampMs, 5e3) && !e.ya(n.ownerId)) {
                    if (e.ma(n) && e.networkEnabled) return !0;
                    if (!e.ma(n)) {
                        if (!n.allowTabSynchronization) 
                        // Fail the `canActAsPrimary` check if the current leaseholder has
                        // not opted into multi-tab synchronization. If this happens at
                        // client startup, we reject the Promise returned by
                        // `enablePersistence()` and the user can continue to use Firestore
                        // with in-memory persistence.
                        // If this fails during a lease refresh, we will instead block the
                        // AsyncQueue from executing further operations. Note that this is
                        // acceptable since mixing & matching different `synchronizeTabs`
                        // settings is not supported.
                        // TODO(b/114226234): Remove this check when `synchronizeTabs` can
                        // no longer be turned off.
                        throw new j(F$1.FAILED_PRECONDITION, to);
                        return !1;
                    }
                }
                return !(!e.networkEnabled || !e.inForeground) || io(t).Xn().next((function(t) {
                    return void 0 === e.ga(t, 5e3).find((function(t) {
                        if (e.clientId !== t.clientId) {
                            var n = !e.networkEnabled && t.networkEnabled, r = !e.inForeground && t.inForeground, i = e.networkEnabled === t.networkEnabled;
                            if (n || r && i) return !0;
                        }
                        return !1;
                    }));
                }));
            })).next((function(t) {
                return e.isPrimary !== t && T$1("IndexedDbPersistence", "Client " + (t ? "is" : "is not") + " eligible for a primary lease."), 
                t;
            }));
        }, t.prototype.pa = function() {
            return __awaiter(this, void 0, void 0, (function() {
                var t = this;
                return __generator(this, (function(e) {
                    switch (e.label) {
                      case 0:
                        // Use `SimpleDb.runTransaction` directly to avoid failing if another tab
                        // has obtained the primary lease.
                        // The shutdown() operations are idempotent and can be called even when
                        // start() aborted (e.g. because it couldn't acquire the persistence lease).
                        return this.Yo = !1, this.va(), this.ta && (this.ta.cancel(), this.ta = null), this.ba(), 
                        this.Sa(), [ 4 /*yield*/ , this.ia.runTransaction("shutdown", "readwrite", [ Ai.store, Fi.store ], (function(e) {
                            var n = new eo(e, zr.nr);
                            return t.Ea(n).next((function() {
                                return t.Aa(n);
                            }));
                        })) ];

                      case 1:
                        // The shutdown() operations are idempotent and can be called even when
                        // start() aborted (e.g. because it couldn't acquire the persistence lease).
                        // Use `SimpleDb.runTransaction` directly to avoid failing if another tab
                        // has obtained the primary lease.
                        return e.sent(), this.ia.close(), 
                        // Remove the entry marking the client as zombied from LocalStorage since
                        // we successfully deleted its metadata from IndexedDb.
                        this.Da(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Returns clients that are not zombied and have an updateTime within the
         * provided threshold.
         */
        t.prototype.ga = function(t, e) {
            var n = this;
            return t.filter((function(t) {
                return n.Pa(t.updateTimeMs, e) && !n.ya(t.clientId);
            }));
        }, 
        /**
         * Returns the IDs of the clients that are currently active. If multi-tab
         * is not supported, returns an array that only contains the local client's
         * ID.
         *
         * PORTING NOTE: This is only used for Web multi-tab.
         */
        t.prototype.Ca = function() {
            var t = this;
            return this.runTransaction("getActiveClients", "readonly", (function(e) {
                return io(e).Xn().next((function(e) {
                    return t.ga(e, 18e5).map((function(t) {
                        return t.clientId;
                    }));
                }));
            }));
        }, Object.defineProperty(t.prototype, "yr", {
            get: function() {
                return this.Yo;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.Na = function(t) {
            return fi.qr(t, this.serializer, this.Fi, this.Lr);
        }, t.prototype.xa = function() {
            return this.ra;
        }, t.prototype.Fa = function() {
            return this.Ni;
        }, t.prototype.Oa = function() {
            return this.Fi;
        }, t.prototype.Ma = function() {
            return this.oa;
        }, t.prototype.runTransaction = function(t, e, n) {
            var r = this;
            T$1("IndexedDbPersistence", "Starting transaction:", t);
            var i, o = "readonly" === e ? "readonly" : "readwrite";
            // Do all transactions as readwrite against all object stores, since we
            // are the only reader/writer.
            return this.ia.runTransaction(t, o, zi, (function(o) {
                return i = new eo(o, r.Jo ? r.Jo.next() : zr.nr), "readwrite-primary" === e ? r.wa(i).next((function(t) {
                    return !!t || r.Ta(i);
                })).next((function(e) {
                    if (!e) throw N$1("Failed to obtain primary lease for action '" + t + "'."), r.isPrimary = !1, 
                    r.ln.Ss((function() {
                        return r.na(!1);
                    })), new j(F$1.FAILED_PRECONDITION, qr);
                    return n(i);
                })).next((function(t) {
                    return r.Ia(i).next((function() {
                        return t;
                    }));
                })) : r.ka(i).next((function() {
                    return n(i);
                }));
            })).then((function(t) {
                return i.Ci(), t;
            }));
        }, 
        /**
         * Verifies that the current tab is the primary leaseholder or alternatively
         * that the leaseholder has opted into multi-tab synchronization.
         */
        // TODO(b/114226234): Remove this check when `synchronizeTabs` can no longer
        // be turned off.
        t.prototype.ka = function(t) {
            var e = this;
            return ro(t).get(Ai.key).next((function(t) {
                if (null !== t && e.Pa(t.leaseTimestampMs, 5e3) && !e.ya(t.ownerId) && !e.ma(t) && !(e.Ho || e.allowTabSynchronization && t.allowTabSynchronization)) throw new j(F$1.FAILED_PRECONDITION, to);
            }));
        }, 
        /**
         * Obtains or extends the new primary lease for the local client. This
         * method does not verify that the client is eligible for this lease.
         */
        t.prototype.Ia = function(t) {
            var e = new Ai(this.clientId, this.allowTabSynchronization, Date.now());
            return ro(t).put(Ai.key, e);
        }, t.kn = function() {
            return ur.kn();
        }, 
        /** Checks the primary lease and removes it if we are the current primary. */ t.prototype.Ea = function(t) {
            var e = this, n = ro(t);
            return n.get(Ai.key).next((function(t) {
                return e.ma(t) ? (T$1("IndexedDbPersistence", "Releasing primary lease."), n.delete(Ai.key)) : or.resolve();
            }));
        }, 
        /** Verifies that `updateTimeMs` is within `maxAgeMs`. */ t.prototype.Pa = function(t, e) {
            var n = Date.now();
            return !(t < n - e || t > n && (N$1("Detected an update time that is in the future: " + t + " > " + n), 
            1));
        }, t.prototype.ua = function() {
            var t = this;
            null !== this.document && "function" == typeof this.document.addEventListener && (this.Zo = function() {
                t.ln.fs((function() {
                    return t.inForeground = "visible" === t.document.visibilityState, t.ca();
                }));
            }, this.document.addEventListener("visibilitychange", this.Zo), this.inForeground = "visible" === this.document.visibilityState);
        }, t.prototype.ba = function() {
            this.Zo && (this.document.removeEventListener("visibilitychange", this.Zo), this.Zo = null);
        }, 
        /**
         * Attaches a window.unload handler that will synchronously write our
         * clientId to a "zombie client id" location in LocalStorage. This can be used
         * by tabs trying to acquire the primary lease to determine that the lease
         * is no longer valid even if the timestamp is recent. This is particularly
         * important for the refresh case (so the tab correctly re-acquires the
         * primary lease). LocalStorage is used for this rather than IndexedDb because
         * it is a synchronous API and so can be used reliably from  an unload
         * handler.
         */
        t.prototype.ha = function() {
            var t, e = this;
            "function" == typeof (null === (t = this.window) || void 0 === t ? void 0 : t.addEventListener) && (this.Xo = function() {
                // Note: In theory, this should be scheduled on the AsyncQueue since it
                // accesses internal state. We execute this code directly during shutdown
                // to make sure it gets a chance to run.
                e.va(), e.ln.fs((function() {
                    return e.pa();
                }));
            }, this.window.addEventListener("unload", this.Xo));
        }, t.prototype.Sa = function() {
            this.Xo && (this.window.removeEventListener("unload", this.Xo), this.Xo = null);
        }, 
        /**
         * Returns whether a client is "zombied" based on its LocalStorage entry.
         * Clients become zombied when their tab closes without running all of the
         * cleanup logic in `shutdown()`.
         */
        t.prototype.ya = function(t) {
            var e;
            try {
                var n = null !== (null === (e = this.aa) || void 0 === e ? void 0 : e.getItem(this.Va(t)));
                return T$1("IndexedDbPersistence", "Client '" + t + "' " + (n ? "is" : "is not") + " zombied in LocalStorage"), 
                n;
            } catch (t) {
                // Gracefully handle if LocalStorage isn't working.
                return N$1("IndexedDbPersistence", "Failed to get zombied client id.", t), !1;
            }
        }, 
        /**
         * Record client as zombied (a client that had its tab closed). Zombied
         * clients are ignored during primary tab selection.
         */
        t.prototype.va = function() {
            if (this.aa) try {
                this.aa.setItem(this.Va(this.clientId), String(Date.now()));
            } catch (t) {
                // Gracefully handle if LocalStorage isn't available / working.
                N$1("Failed to set zombie client id.", t);
            }
        }, 
        /** Removes the zombied client entry if it exists. */ t.prototype.Da = function() {
            if (this.aa) try {
                this.aa.removeItem(this.Va(this.clientId));
            } catch (t) {
                // Ignore
            }
        }, t.prototype.Va = function(t) {
            return "firestore_zombie_" + this.persistenceKey + "_" + t;
        }, t;
    }();

    /**
     * Oldest acceptable age in milliseconds for client metadata before the client
     * is considered inactive and its associated data is garbage collected.
     */
    /**
     * Helper to get a typed SimpleDbStore for the primary client object store.
     */
    function ro(t) {
        return no.qn(t, Ai.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the client metadata object store.
     */ function io(t) {
        return no.qn(t, Fi.store);
    }

    /** Provides LRU functionality for IndexedDB persistence. */ var oo = /** @class */ function() {
        function t(t, e) {
            this.db = t, this.Rr = new Hr(this, e);
        }
        return t.prototype.Sr = function(t) {
            var e = this.$a(t);
            return this.db.xa().Bo(t).next((function(t) {
                return e.next((function(e) {
                    return t + e;
                }));
            }));
        }, t.prototype.$a = function(t) {
            var e = 0;
            return this.Cr(t, (function(t) {
                e++;
            })).next((function() {
                return e;
            }));
        }, t.prototype.De = function(t, e) {
            return this.db.xa().De(t, e);
        }, t.prototype.Cr = function(t, e) {
            return this.La(t, (function(t, n) {
                return e(n);
            }));
        }, t.prototype.Qo = function(t, e, n) {
            return uo(t, n);
        }, t.prototype.Wo = function(t, e, n) {
            return uo(t, n);
        }, t.prototype.Nr = function(t, e, n) {
            return this.db.xa().Nr(t, e, n);
        }, t.prototype.eo = function(t, e) {
            return uo(t, e);
        }, 
        /**
         * Returns true if anything would prevent this document from being garbage
         * collected, given that the document in question is not present in any
         * targets and has a sequence number less than or equal to the upper bound for
         * the collection run.
         */
        t.prototype.Ba = function(t, e) {
            return function(t, e) {
                var n = !1;
                return yi(t).ss((function(r) {
                    return li(t, r, e).next((function(t) {
                        return t && (n = !0), or.resolve(!t);
                    }));
                })).next((function() {
                    return n;
                }));
            }(t, e);
        }, t.prototype.Fr = function(t, e) {
            var n = this, r = this.db.Fa()._o(), i = [], o = 0;
            return this.La(t, (function(u, s) {
                if (s <= e) {
                    var a = n.Ba(t, u).next((function(e) {
                        if (!e) 
                        // Our size accounting requires us to read all documents before
                        // removing them.
                        return o++, r.yi(t, u).next((function() {
                            return r.Vi(u), Zi(t).delete([ 0, Jr(u.path) ]);
                        }));
                    }));
                    i.push(a);
                }
            })).next((function() {
                return or.xn(i);
            })).next((function() {
                return r.apply(t);
            })).next((function() {
                return o;
            }));
        }, t.prototype.removeTarget = function(t, e) {
            var n = e.nt(t.Go);
            return this.db.xa().ko(t, n);
        }, t.prototype.qa = function(t, e) {
            return uo(t, e);
        }, 
        /**
         * Call provided function for each document in the cache that is 'orphaned'. Orphaned
         * means not a part of any target, so the only entry in the target-document index for
         * that document will be the sentinel row (targetId 0), which will also have the sequence
         * number for the last time the document was accessed.
         */
        t.prototype.La = function(t, e) {
            var n, r = Zi(t), i = zr.nr;
            return r.ns({
                index: Ri.documentTargetsIndex
            }, (function(t, r) {
                var o = t[0], u = (t[1], r.path), s = r.sequenceNumber;
                0 === o ? (
                // if nextToReport is valid, report it, this is a new key so the
                // last one must not be a member of any targets.
                i !== zr.nr && e(new Y$1(Zr(n)), i), 
                // set nextToReport to be this sequence number. It's the next one we
                // might report, if we don't find any targets for this document.
                // Note that the sequence number must be defined when the targetId
                // is 0.
                i = s, n = u) : 
                // set nextToReport to be invalid, we know we don't need to report
                // this one since we found a target for it.
                i = zr.nr;
            })).next((function() {
                // Since we report sequence numbers after getting to the next key, we
                // need to check if the last key we iterated over was an orphaned
                // document and report it.
                i !== zr.nr && e(new Y$1(Zr(n)), i);
            }));
        }, t.prototype.Mr = function(t) {
            return this.db.Fa().wo(t);
        }, t;
    }();

    function uo(t, e) {
        return Zi(t).put(
        /**
     * @return A value suitable for writing a sentinel row in the target-document
     * store.
     */
        function(t, e) {
            return new Ri(0, Jr(t.path), e);
        }(e, t.Go));
    }

    /**
     * Generates a string used as a prefix when storing data in IndexedDB and
     * LocalStorage.
     */ function so(t, e) {
        // Use two different prefix formats:
        //   * firestore / persistenceKey / projectID . databaseID / ...
        //   * firestore / persistenceKey / projectID / ...
        // projectIDs are DNS-compatible names and cannot contain dots
        // so there's no danger of collisions.
        var n = t.projectId;
        return t.o || (n += "." + t.database), "firestore/" + e + "/" + n + "/"
        /**
     * Implements `LocalStore` interface.
     *
     * Note: some field defined in this class might have public access level, but
     * the class is not exported so they are only accessible from this module.
     * This is useful to implement optional features (like bundles) in free
     * functions, such that they are tree-shakeable.
     */;
    }

    var ao = /** @class */ function() {
        function t(
        /** Manages our in-memory or durable persistence. */
        t, e, n, r) {
            this.persistence = t, this.Ua = e, this.serializer = r, 
            /**
                 * Maps a targetID to data about its target.
                 *
                 * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
                 * of `applyRemoteEvent()` idempotent.
                 */
            this.Qa = new ht(V$1), 
            /** Maps a target to its targetID. */
            // TODO(wuandy): Evaluate if TargetId can be part of Target.
            this.Ka = new q$1((function(t) {
                return tt(t);
            }), et), 
            /**
                 * The read time of the last entry processed by `getNewDocumentChanges()`.
                 *
                 * PORTING NOTE: This is only used for multi-tab synchronization.
                 */
            this.Wa = z.min(), this.xi = t.Na(n), this.ja = t.Fa(), this.ra = t.xa(), this.Ga = new jr(this.ja, this.xi, this.persistence.Oa()), 
            this.oa = t.Ma(), this.Ua.za(this.Ga);
        }
        return t.prototype.pr = function(t) {
            var e = this;
            return this.persistence.runTransaction("Collect garbage", "readwrite-primary", (function(n) {
                return t.Or(n, e.Qa);
            }));
        }, t;
    }();

    function co(
    /** Manages our in-memory or durable persistence. */
    t, e, n, r) {
        return new ao(t, e, n, r);
    }

    /**
     * Tells the LocalStore that the currently authenticated user has changed.
     *
     * In response the local store switches the mutation queue to the new user and
     * returns any resulting document changes.
     */
    // PORTING NOTE: Android and iOS only return the documents affected by the
    // change.
    function ho(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o, u;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return e = D$1(t), i = e.xi, o = e.Ga, [ 4 /*yield*/ , e.persistence.runTransaction("Handle user change", "readonly", (function(t) {
                        // Swap out the mutation queue, grabbing the pending mutation batches
                        // before and after.
                        var n;
                        return e.xi.Hr(t).next((function(u) {
                            return n = u, i = e.persistence.Na(r), 
                            // Recreate our LocalDocumentsView using the new
                            // MutationQueue.
                            o = new jr(e.ja, i, e.persistence.Oa()), i.Hr(t);
                        })).next((function(e) {
                            for (var r = [], i = [], u = It(), s = 0, a = n
                            // Union the old/new changed keys.
                            ; s < a.length; s++) {
                                var c = a[s];
                                r.push(c.batchId);
                                for (var h = 0, f = c.mutations; h < f.length; h++) {
                                    var l = f[h];
                                    u = u.add(l.key);
                                }
                            }
                            for (var p = 0, d = e; p < d.length; p++) {
                                var v = d[p];
                                i.push(v.batchId);
                                for (var y = 0, g = v.mutations; y < g.length; y++) {
                                    var m = g[y];
                                    u = u.add(m.key);
                                }
                            }
                            // Return the set of all (potentially) changed documents and the list
                            // of mutation batch IDs that were affected by change.
                                                    return o.Li(t, u).next((function(t) {
                                return {
                                    Ha: t,
                                    Ja: r,
                                    Ya: i
                                };
                            }));
                        }));
                    })) ];

                  case 1:
                    return u = n.sent(), [ 2 /*return*/ , (e.xi = i, e.Ga = o, e.Ua.za(e.Ga), u) ];
                }
            }));
        }));
    }

    /* Accepts locally generated Mutations and commit them to storage. */
    /**
     * Acknowledges the given batch.
     *
     * On the happy path when a batch is acknowledged, the local store will
     *
     *  + remove the batch from the mutation queue;
     *  + apply the changes to the remote document cache;
     *  + recalculate the latency compensated view implied by those changes (there
     *    may be mutations in the queue that affect the documents but haven't been
     *    acknowledged yet); and
     *  + give the changed documents back the sync engine
     *
     * @returns The resulting (modified) documents.
     */ function fo(t, e) {
        var n = D$1(t);
        return n.persistence.runTransaction("Acknowledge batch", "readwrite-primary", (function(t) {
            var r = e.batch.keys(), i = n.ja._o({
                fo: !0
            });
            return function(t, e, n, r) {
                var i = n.batch, o = i.keys(), u = or.resolve();
                return o.forEach((function(t) {
                    u = u.next((function() {
                        return r.yi(e, t);
                    })).next((function(e) {
                        var o = e, u = n.Ei.get(t);
                        k$1(null !== u), (!o || o.version.A(u) < 0) && ((o = i._i(t, o, n)) && 
                        // We use the commitVersion as the readTime rather than the
                        // document's updateTime since the updateTime is not advanced
                        // for updates that do not modify the underlying document.
                        r.Ri(o, n.Ti));
                    }));
                })), u.next((function() {
                    return t.xi.Yr(e, i);
                }));
            }(n, t, e, i).next((function() {
                return i.apply(t);
            })).next((function() {
                return n.xi.no(t);
            })).next((function() {
                return n.Ga.Li(t, r);
            }));
        }));
    }

    /**
     * Removes mutations from the MutationQueue for the specified batch;
     * LocalDocuments will be recalculated.
     *
     * @returns The resulting modified documents.
     */
    /**
     * Returns the last consistent snapshot processed (used by the RemoteStore to
     * determine whether to buffer incoming snapshots from the backend).
     */ function lo(t) {
        var e = D$1(t);
        return e.persistence.runTransaction("Get last remote snapshot version", "readonly", (function(t) {
            return e.ra.Co(t);
        }));
    }

    /**
     * Updates the "ground-state" (remote) documents. We assume that the remote
     * event reflects any write batches that have been acknowledged or rejected
     * (i.e. we do not re-apply local mutations to updates from this event).
     *
     * LocalDocuments are re-calculated if there are remaining mutations in the
     * queue.
     */ function po(t, e) {
        var n = D$1(t), r = e.et, i = n.Qa;
        return n.persistence.runTransaction("Apply remote event", "readwrite-primary", (function(t) {
            var o = n.ja._o({
                fo: !0
            });
            // Reset newTargetDataByTargetMap in case this transaction gets re-run.
                    i = n.Qa;
            var u = [];
            e.Gt.forEach((function(e, o) {
                var s = i.get(o);
                if (s) {
                    // Only update the remote keys if the target is still active. This
                    // ensures that we can persist the updated target data along with
                    // the updated assignment.
                    u.push(n.ra.Ko(t, e.ne, o).next((function() {
                        return n.ra.Uo(t, e.te, o);
                    })));
                    var a = e.resumeToken;
                    // Update the resume token if the change includes one.
                                    if (a.X() > 0) {
                        var c = s.st(a, r).nt(t.Go);
                        i = i.rt(o, c), 
                        // Update the target data if there are target changes (or if
                        // sufficient time has passed since the last update).
                        /**
         * Returns true if the newTargetData should be persisted during an update of
         * an active target. TargetData should always be persisted when a target is
         * being released and should not call this function.
         *
         * While the target is active, TargetData updates can be omitted when nothing
         * about the target has changed except metadata like the resume token or
         * snapshot version. Occasionally it's worth the extra write to prevent these
         * values from getting too stale after a crash, but this doesn't have to be
         * too frequent.
         */
                        function(t, e, n) {
                            // Always persist target data if we don't already have a resume token.
                            return k$1(e.resumeToken.X() > 0), 0 === t.resumeToken.X() || (
                            // Don't allow resume token changes to be buffered indefinitely. This
                            // allows us to be reasonably up-to-date after a crash and avoids needing
                            // to loop over all active queries on shutdown. Especially in the browser
                            // we may not get time to do anything interesting while the current tab is
                            // closing.
                            e.et.R() - t.et.R() >= 3e8 || n.te.size + n.ee.size + n.ne.size > 0);
                        }(s, c, e) && u.push(n.ra.ko(t, c));
                    }
                }
            }));
            var s = yt();
            // HACK: The only reason we allow a null snapshot version is so that we
            // can synthesize remote events when we get permission denied errors while
            // trying to resolve the state of a locally cached document that is in
            // limbo.
                    if (e.Ht.forEach((function(r, i) {
                e.Jt.has(r) && u.push(n.persistence.Lr.qa(t, r));
            })), 
            // Each loop iteration only affects its "own" doc, so it's safe to get all the remote
            // documents in advance in a single call.
            u.push(
            /**
         * Populates document change buffer with documents from backend or a bundle.
         * Returns the document changes resulting from applying those documents.
         *
         * @param txn Transaction to use to read existing documents from storage.
         * @param documentBuffer Document buffer to collect the resulted changes to be
         *        applied to storage.
         * @param documents Documents to be applied.
         * @param globalVersion A `SnapshotVersion` representing the read time if all
         *        documents have the same read time.
         * @param documentVersions A DocumentKey-to-SnapshotVersion map if documents
         *        have their own read time.
         *
         * Note: this function will use `documentVersions` if it is defined;
         * when it is not defined, resorts to `globalVersion`.
         */
            function(t, e, n, r, 
            // TODO(wuandy): We could add `readTime` to MaybeDocument instead to remove
            // this parameter.
            i) {
                var o = It();
                return n.forEach((function(t) {
                    return o = o.add(t);
                })), e.getEntries(t, o).next((function(t) {
                    var i = yt();
                    return n.forEach((function(n, o) {
                        var u = t.get(n), s = r;
                        // Note: The order of the steps below is important, since we want
                        // to ensure that rejected limbo resolutions (which fabricate
                        // NoDocuments with SnapshotVersion.min()) never add documents to
                        // cache.
                                            o instanceof _n && o.version.isEqual(z.min()) ? (
                        // NoDocuments with SnapshotVersion.min() are used in manufactured
                        // events. We remove these documents from cache since we lost
                        // access.
                        e.Vi(n, s), i = i.rt(n, o)) : null == u || o.version.A(u.version) > 0 || 0 === o.version.A(u.version) && u.hasPendingWrites ? (e.Ri(o, s), 
                        i = i.rt(n, o)) : T$1("LocalStore", "Ignoring outdated watch update for ", n, ". Current version:", u.version, " Watch version:", o.version);
                    })), i;
                }));
            }(t, o, e.Ht, r).next((function(t) {
                s = t;
            }))), !r.isEqual(z.min())) {
                var a = n.ra.Co(t).next((function(e) {
                    return n.ra.xo(t, t.Go, r);
                }));
                u.push(a);
            }
            return or.xn(u).next((function() {
                return o.apply(t);
            })).next((function() {
                return n.Ga.Bi(t, s);
            }));
        })).then((function(t) {
            return n.Qa = i, t;
        }));
    }

    /**
     * Gets the mutation batch after the passed in batchId in the mutation queue
     * or null if empty.
     * @param afterBatchId If provided, the batch to search after.
     * @returns The next mutation or null if there wasn't one.
     */ function vo(t, e) {
        var n = D$1(t);
        return n.persistence.runTransaction("Get next mutation batch", "readonly", (function(t) {
            return void 0 === e && (e = -1), n.xi.Gr(t, e);
        }));
    }

    /**
     * Reads the current value of a Document with a given key or null if not
     * found - used for testing.
     */
    /**
     * Assigns the given target an internal ID so that its results can be pinned so
     * they don't get GC'd. A target must be allocated in the local store before
     * the store can be used to manage its view.
     *
     * Allocating an already allocated `Target` will return the existing `TargetData`
     * for that `Target`.
     */ function yo(t, e) {
        var n = D$1(t);
        return n.persistence.runTransaction("Allocate target", "readwrite", (function(t) {
            var r;
            return n.ra.qo(t, e).next((function(i) {
                return i ? (
                // This target has been listened to previously, so reuse the
                // previous targetID.
                // TODO(mcg): freshen last accessed date?
                r = i, or.resolve(r)) : n.ra.bo(t).next((function(i) {
                    return r = new ut(e, i, 0 /* Listen */ , t.Go), n.ra.Fo(t, r).next((function() {
                        return r;
                    }));
                }));
            }));
        })).then((function(t) {
            // If Multi-Tab is enabled, the existing target data may be newer than
            // the in-memory data
            var r = n.Qa.get(t.targetId);
            return (null === r || t.et.A(r.et) > 0) && (n.Qa = n.Qa.rt(t.targetId, t), n.Ka.set(e, t.targetId)), 
            t;
        }));
    }

    /**
     * Returns the TargetData as seen by the LocalStore, including updates that may
     * have not yet been persisted to the TargetCache.
     */
    // Visible for testing.
    /**
     * Unpins all the documents associated with the given target. If
     * `keepPersistedTargetData` is set to false and Eager GC enabled, the method
     * directly removes the associated target data from the target cache.
     *
     * Releasing a non-existing `Target` is a no-op.
     */
    // PORTING NOTE: `keepPersistedTargetData` is multi-tab only.
    function go(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, o, u, s;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    e = D$1(t), o = e.Qa.get(r), u = i ? "readwrite" : "readwrite-primary", n.label = 1;

                  case 1:
                    return n.trys.push([ 1, 4, , 5 ]), i ? [ 3 /*break*/ , 3 ] : [ 4 /*yield*/ , e.persistence.runTransaction("Release target", u, (function(t) {
                        return e.persistence.Lr.removeTarget(t, o);
                    })) ];

                  case 2:
                    n.sent(), n.label = 3;

                  case 3:
                    return [ 3 /*break*/ , 5 ];

                  case 4:
                    if (!cr(s = n.sent())) throw s;
                    // All `releaseTarget` does is record the final metadata state for the
                    // target, but we've been recording this periodically during target
                    // activity. If we lose this write this could cause a very slight
                    // difference in the order of target deletion during GC, but we
                    // don't define exact LRU semantics so this is acceptable.
                                    return T$1("LocalStore", "Failed to update sequence numbers for target " + r + ": " + s), 
                    [ 3 /*break*/ , 5 ];

                  case 5:
                    return e.Qa = e.Qa.remove(r), e.Ka.delete(o.target), [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Runs the specified query against the local store and returns the results,
     * potentially taking advantage of query data from previous executions (such
     * as the set of remote keys).
     *
     * @param usePreviousResults Whether results from previous executions can
     * be used to optimize this query execution.
     */ function mo(t, e, n) {
        var r = D$1(t), i = z.min(), o = It();
        return r.persistence.runTransaction("Execute query", "readonly", (function(t) {
            return function(t, e, n) {
                var r = D$1(t), i = r.Ka.get(n);
                return void 0 !== i ? or.resolve(r.Qa.get(i)) : r.ra.qo(e, n);
            }(r, t, Pn(e)).next((function(e) {
                if (e) return i = e.lastLimboFreeSnapshotVersion, r.ra.jo(t, e.targetId).next((function(t) {
                    o = t;
                }));
            })).next((function() {
                return r.Ua.Ui(t, e, n ? i : z.min(), n ? o : It());
            })).next((function(t) {
                return {
                    documents: t,
                    Xa: o
                };
            }));
        }));
    }

    // PORTING NOTE: Multi-Tab only.
    function wo(t, e) {
        var n = D$1(t), r = D$1(n.ra), i = n.Qa.get(e);
        return i ? Promise.resolve(i.target) : n.persistence.runTransaction("Get target data", "readonly", (function(t) {
            return r.qe(t, e).next((function(t) {
                return t ? t.target : null;
            }));
        }));
    }

    /**
     * Returns the set of documents that have been updated since the last call.
     * If this is the first call, returns the set of changes since client
     * initialization. Further invocations will return document that have changed
     * since the prior call.
     */
    // PORTING NOTE: Multi-Tab only.
    function bo(t) {
        var e = D$1(t);
        return e.persistence.runTransaction("Get new document changes", "readonly", (function(t) {
            return function(t, e, n) {
                var r = D$1(t), i = yt(), o = ri(n), u = bi(e), s = IDBKeyRange.lowerBound(o, !0);
                return u.ns({
                    index: Vi.readTimeIndex,
                    range: s
                }, (function(t, e) {
                    // Unlike `getEntry()` and others, `getNewDocumentChanges()` parses
                    // the documents directly since we want to keep sentinel deletes.
                    var n = ei(r.serializer, e);
                    i = i.rt(n.key, n), o = e.readTime;
                })).next((function() {
                    return {
                        Za: i,
                        readTime: ii(o)
                    };
                }));
            }(e.ja, t, e.Wa);
        })).then((function(t) {
            var n = t.Za, r = t.readTime;
            return e.Wa = r, n;
        }));
    }

    /**
     * Reads the newest document change from persistence and moves the internal
     * synchronization marker forward so that calls to `getNewDocumentChanges()`
     * only return changes that happened after client initialization.
     */
    // PORTING NOTE: Multi-Tab only.
    function _o(t) {
        return __awaiter(this, void 0, void 0, (function() {
            var e;
            return __generator(this, (function(n) {
                return [ 2 /*return*/ , (e = D$1(t)).persistence.runTransaction("Synchronize last document change read time", "readonly", (function(t) {
                    return function(t) {
                        var e = bi(t), n = z.min();
                        // If there are no existing entries, we return SnapshotVersion.min().
                                            return e.ns({
                            index: Vi.readTimeIndex,
                            reverse: !0
                        }, (function(t, e, r) {
                            e.readTime && (n = ii(e.readTime)), r.done();
                        })).next((function() {
                            return n;
                        }));
                    }(t);
                })).then((function(t) {
                    e.Wa = t;
                })) ];
            }));
        }));
    }

    /**
     * Verifies the error thrown by a LocalStore operation. If a LocalStore
     * operation fails because the primary lease has been taken by another client,
     * we ignore the error (the persistence layer will immediately call
     * `applyPrimaryLease` to propagate the primary state change). All other errors
     * are re-thrown.
     *
     * @param err An error returned by a LocalStore operation.
     * @return A Promise that resolves after we recovered, or the original error.
     */ function Io(t) {
        return __awaiter(this, void 0, void 0, (function() {
            return __generator(this, (function(e) {
                if (t.code !== F$1.FAILED_PRECONDITION || t.message !== qr) throw t;
                return T$1("LocalStore", "Unexpectedly lost primary lease"), [ 2 /*return*/ ];
            }));
        }));
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A PersistentStream is an abstract base class that represents a streaming RPC
     * to the Firestore backend. It's built on top of the connections own support
     * for streaming RPCs, and adds several critical features for our clients:
     *
     *   - Exponential backoff on failure
     *   - Authentication via CredentialsProvider
     *   - Dispatching all callbacks into the shared worker queue
     *   - Closing idle streams after 60 seconds of inactivity
     *
     * Subclasses of PersistentStream implement serialization of models to and
     * from the JSON representation of the protocol buffers for a specific
     * streaming RPC.
     *
     * ## Starting and Stopping
     *
     * Streaming RPCs are stateful and need to be start()ed before messages can
     * be sent and received. The PersistentStream will call the onOpen() function
     * of the listener once the stream is ready to accept requests.
     *
     * Should a start() fail, PersistentStream will call the registered onClose()
     * listener with a FirestoreError indicating what went wrong.
     *
     * A PersistentStream can be started and stopped repeatedly.
     *
     * Generic types:
     *  SendType: The type of the outgoing message of the underlying
     *    connection stream
     *  ReceiveType: The type of the incoming message of the underlying
     *    connection stream
     *  ListenerType: The type of the listener that will be used for callbacks
     */ var Eo = /** @class */ function() {
        function t(t, e, n, r, i, o) {
            this.ln = t, this.tc = n, this.ec = r, this.nc = i, this.listener = o, this.state = 0 /* Initial */ , 
            /**
                 * A close count that's incremented every time the stream is closed; used by
                 * getCloseGuardedDispatcher() to invalidate callbacks that happen after
                 * close.
                 */
            this.sc = 0, this.ic = null, this.stream = null, this.Ps = new ir(t, e)
            /**
         * Returns true if start() has been called and no error has occurred. True
         * indicates the stream is open or in the process of opening (which
         * encompasses respecting backoff, getting auth tokens, and starting the
         * actual RPC). Use isOpen() to determine if the stream is open and ready for
         * outbound requests.
         */;
        }
        return t.prototype.rc = function() {
            return 1 /* Starting */ === this.state || 2 /* Open */ === this.state || 4 /* Backoff */ === this.state;
        }, 
        /**
         * Returns true if the underlying RPC is open (the onOpen() listener has been
         * called) and the stream is ready for outbound requests.
         */
        t.prototype.oc = function() {
            return 2 /* Open */ === this.state;
        }, 
        /**
         * Starts the RPC. Only allowed if isStarted() returns false. The stream is
         * not immediately ready for use: onOpen() will be invoked when the RPC is
         * ready for outbound requests, at which point isOpen() will return true.
         *
         * When start returns, isStarted() will return true.
         */
        t.prototype.start = function() {
            3 /* Error */ !== this.state ? this.auth() : this.ac();
        }, 
        /**
         * Stops the RPC. This call is idempotent and allowed regardless of the
         * current isStarted() state.
         *
         * When stop returns, isStarted() and isOpen() will both return false.
         */
        t.prototype.stop = function() {
            return __awaiter(this, void 0, void 0, (function() {
                return __generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.rc() ? [ 4 /*yield*/ , this.close(0 /* Initial */) ] : [ 3 /*break*/ , 2 ];

                      case 1:
                        t.sent(), t.label = 2;

                      case 2:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * After an error the stream will usually back off on the next attempt to
         * start it. If the error warrants an immediate restart of the stream, the
         * sender can use this to indicate that the receiver should not back off.
         *
         * Each error will call the onClose() listener. That function can decide to
         * inhibit backoff if required.
         */
        t.prototype.cc = function() {
            this.state = 0 /* Initial */ , this.Ps.reset();
        }, 
        /**
         * Marks this stream as idle. If no further actions are performed on the
         * stream for one minute, the stream will automatically close itself and
         * notify the stream's onClose() handler with Status.OK. The stream will then
         * be in a !isStarted() state, requiring the caller to start the stream again
         * before further use.
         *
         * Only streams that are in state 'Open' can be marked idle, as all other
         * states imply pending network operations.
         */
        t.prototype.uc = function() {
            var t = this;
            // Starts the idle time if we are in state 'Open' and are not yet already
            // running a timer (in which case the previous idle timeout still applies).
                    this.oc() && null === this.ic && (this.ic = this.ln.Pn(this.tc, 6e4, (function() {
                return t.hc();
            })));
        }, 
        /** Sends a message to the underlying stream. */ t.prototype.lc = function(t) {
            this._c(), this.stream.send(t);
        }, 
        /** Called by the idle timer when the stream should close due to inactivity. */ t.prototype.hc = function() {
            return __awaiter(this, void 0, void 0, (function() {
                return __generator(this, (function(t) {
                    return this.oc() ? [ 2 /*return*/ , this.close(0 /* Initial */) ] : [ 2 /*return*/ ];
                }));
            }));
        }, 
        /** Marks the stream as active again. */ t.prototype._c = function() {
            this.ic && (this.ic.cancel(), this.ic = null);
        }, 
        /**
         * Closes the stream and cleans up as necessary:
         *
         * * closes the underlying GRPC stream;
         * * calls the onClose handler with the given 'error';
         * * sets internal stream state to 'finalState';
         * * adjusts the backoff timer based on the error
         *
         * A new stream can be opened by calling start().
         *
         * @param finalState the intended state of the stream after closing.
         * @param error the error the connection was closed with.
         */
        t.prototype.close = function(t, r) {
            return __awaiter(this, void 0, void 0, (function() {
                return __generator(this, (function(e) {
                    switch (e.label) {
                      case 0:
                        // Notify the listener that the stream closed.
                        // Cancel any outstanding timers (they're guaranteed not to execute).
                        return this._c(), this.Ps.cancel(), 
                        // Invalidates any stream-related callbacks (e.g. from auth or the
                        // underlying stream), guaranteeing they won't execute.
                        this.sc++, 3 /* Error */ !== t ? 
                        // If this is an intentional close ensure we don't delay our next connection attempt.
                        this.Ps.reset() : r && r.code === F$1.RESOURCE_EXHAUSTED ? (
                        // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
                        N$1(r.toString()), N$1("Using maximum backoff delay to prevent overloading the backend."), 
                        this.Ps.mn()) : r && r.code === F$1.UNAUTHENTICATED && 
                        // "unauthenticated" error means the token was rejected. Try force refreshing it in case it
                        // just expired.
                        this.nc.ni(), 
                        // Clean up the underlying stream because we are no longer interested in events.
                        null !== this.stream && (this.fc(), this.stream.close(), this.stream = null), 
                        // This state must be assigned before calling onClose() to allow the callback to
                        // inhibit backoff or otherwise manipulate the state in its non-started state.
                        this.state = t, [ 4 /*yield*/ , this.listener.dc(r) ];

                      case 1:
                        // Cancel any outstanding timers (they're guaranteed not to execute).
                        // Notify the listener that the stream closed.
                        return e.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Can be overridden to perform additional cleanup before the stream is closed.
         * Calling super.tearDown() is not required.
         */
        t.prototype.fc = function() {}, t.prototype.auth = function() {
            var t = this;
            this.state = 1 /* Starting */;
            var e = this.wc(this.sc), n = this.sc;
            // TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
                    this.nc.getToken().then((function(e) {
                // Stream can be stopped while waiting for authentication.
                // TODO(mikelehen): We really should just use dispatchIfNotClosed
                // and let this dispatch onto the queue, but that opened a spec test can
                // of worms that I don't want to deal with in this PR.
                t.sc === n && 
                // Normally we'd have to schedule the callback on the AsyncQueue.
                // However, the following calls are safe to be called outside the
                // AsyncQueue since they don't chain asynchronous calls
                t.Tc(e);
            }), (function(n) {
                e((function() {
                    var e = new j(F$1.UNKNOWN, "Fetching auth token failed: " + n.message);
                    return t.Ec(e);
                }));
            }));
        }, t.prototype.Tc = function(t) {
            var e = this, n = this.wc(this.sc);
            this.stream = this.Ic(t), this.stream.mc((function() {
                n((function() {
                    return e.state = 2 /* Open */ , e.listener.mc();
                }));
            })), this.stream.dc((function(t) {
                n((function() {
                    return e.Ec(t);
                }));
            })), this.stream.onMessage((function(t) {
                n((function() {
                    return e.onMessage(t);
                }));
            }));
        }, t.prototype.ac = function() {
            var t = this;
            this.state = 4 /* Backoff */ , this.Ps.An((function() {
                return __awaiter(t, void 0, void 0, (function() {
                    return __generator(this, (function(t) {
                        return this.state = 0 /* Initial */ , this.start(), [ 2 /*return*/ ];
                    }));
                }));
            }));
        }, 
        // Visible for tests
        t.prototype.Ec = function(t) {
            // In theory the stream could close cleanly, however, in our current model
            // we never expect this to happen because if we stop a stream ourselves,
            // this callback will never be called. To prevent cases where we retry
            // without a backoff accidentally, we set the stream to error in all cases.
            return T$1("PersistentStream", "close with error: " + t), this.stream = null, this.close(3 /* Error */ , t);
        }, 
        /**
         * Returns a "dispatcher" function that dispatches operations onto the
         * AsyncQueue but only runs them if closeCount remains unchanged. This allows
         * us to turn auth / stream callbacks into no-ops if the stream is closed /
         * re-opened, etc.
         */
        t.prototype.wc = function(t) {
            var e = this;
            return function(n) {
                e.ln.fs((function() {
                    return e.sc === t ? n() : (T$1("PersistentStream", "stream callback skipped by getCloseGuardedDispatcher."), 
                    Promise.resolve());
                }));
            };
        }, t;
    }(), To = /** @class */ function(e) {
        function n(t, n, r, i, o) {
            var u = this;
            return (u = e.call(this, t, "listen_stream_connection_backoff" /* ListenStreamConnectionBackoff */ , "listen_stream_idle" /* ListenStreamIdle */ , n, r, o) || this).serializer = i, 
            u;
        }
        return __extends(n, e), n.prototype.Ic = function(t) {
            return this.ec.Ac("Listen", t);
        }, n.prototype.onMessage = function(t) {
            // A successful response means the stream is healthy
            this.Ps.reset();
            var e = function(t, e) {
                var n;
                if ("targetChange" in e) {
                    e.targetChange;
                    // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
                    // if unset
                    var r = function(t) {
                        return "NO_CHANGE" === t ? 0 /* NoChange */ : "ADD" === t ? 1 /* Added */ : "REMOVE" === t ? 2 /* Removed */ : "CURRENT" === t ? 3 /* Current */ : "RESET" === t ? 4 /* Reset */ : S$1();
                    }(e.targetChange.targetChangeType || "NO_CHANGE"), i = e.targetChange.targetIds || [], o = function(t, e) {
                        return t.Ue ? (k$1(void 0 === e || "string" == typeof e), rt.fromBase64String(e || "")) : (k$1(void 0 === e || e instanceof Uint8Array), 
                        rt.fromUint8Array(e || new Uint8Array));
                    }(t, e.targetChange.resumeToken), u = e.targetChange.cause, s = u && function(t) {
                        var e = void 0 === t.code ? F$1.UNKNOWN : ct(t.code);
                        return new j(e, t.message || "");
                    }(u);
                    n = new Pt(r, i, o, s || null);
                } else if ("documentChange" in e) {
                    e.documentChange;
                    var a = e.documentChange;
                    a.document, a.document.name, a.document.updateTime;
                    var c = ye(t, a.document.name), h = le(a.document.updateTime), f = new yn({
                        mapValue: {
                            fields: a.document.fields
                        }
                    }), l = new bn(c, h, f, {}), p = a.targetIds || [], d = a.removedTargetIds || [];
                    n = new Dt(p, d, l.key, l);
                } else if ("documentDelete" in e) {
                    e.documentDelete;
                    var v = e.documentDelete;
                    v.document;
                    var y = ye(t, v.document), g = v.readTime ? le(v.readTime) : z.min(), m = new _n(y, g), w = v.removedTargetIds || [];
                    n = new Dt([], w, m.key, m);
                } else if ("documentRemove" in e) {
                    e.documentRemove;
                    var b = e.documentRemove;
                    b.document;
                    var _ = ye(t, b.document), I = b.removedTargetIds || [];
                    n = new Dt([], I, _, null);
                } else {
                    if (!("filter" in e)) return S$1();
                    e.filter;
                    var E = e.filter;
                    E.targetId;
                    var T = E.count || 0, N = new st(T), x = E.targetId;
                    n = new Ot(x, N);
                }
                return n;
            }(this.serializer, t), n = function(t) {
                // We have only reached a consistent snapshot for the entire stream if there
                // is a read_time set and it applies to all targets (i.e. the list of
                // targets is empty). The backend is guaranteed to send such responses.
                if (!("targetChange" in t)) return z.min();
                var e = t.targetChange;
                return e.targetIds && e.targetIds.length ? z.min() : e.readTime ? le(e.readTime) : z.min();
            }(t);
            return this.listener.Rc(e, n);
        }, 
        /**
         * Registers interest in the results of the given target. If the target
         * includes a resumeToken it will be included in the request. Results that
         * affect the target will be streamed back as WatchChange messages that
         * reference the targetId.
         */
        n.prototype.Pc = function(t) {
            var e = {};
            e.database = we(this.serializer), e.addTarget = function(t, e) {
                var n, r = e.target;
                return (n = nt(r) ? {
                    documents: Te(t, r)
                } : {
                    query: Ne(t, r)
                }).targetId = e.targetId, e.resumeToken.X() > 0 ? n.resumeToken = he(t, e.resumeToken) : e.et.A(z.min()) > 0 && (
                // TODO(wuandy): Consider removing above check because it is most likely true.
                // Right now, many tests depend on this behaviour though (leaving min() out
                // of serialization).
                n.readTime = ce(t, e.et.P())), n;
            }(this.serializer, t);
            var n = function(t, e) {
                var n = function(t, e) {
                    switch (e) {
                      case 0 /* Listen */ :
                        return null;

                      case 1 /* ExistenceFilterMismatch */ :
                        return "existence-filter-mismatch";

                      case 2 /* LimboResolution */ :
                        return "limbo-document";

                      default:
                        return S$1();
                    }
                }(0, e.tt);
                return null == n ? null : {
                    "goog-listen-tags": n
                };
            }(this.serializer, t);
            n && (e.labels = n), this.lc(e);
        }, 
        /**
         * Unregisters interest in the results of the target associated with the
         * given targetId.
         */
        n.prototype.gc = function(t) {
            var e = {};
            e.database = we(this.serializer), e.removeTarget = t, this.lc(e);
        }, n;
    }(Eo), No = /** @class */ function(e) {
        function n(t, n, r, i, o) {
            var u = this;
            return (u = e.call(this, t, "write_stream_connection_backoff" /* WriteStreamConnectionBackoff */ , "write_stream_idle" /* WriteStreamIdle */ , n, r, o) || this).serializer = i, 
            u.Vc = !1, u;
        }
        return __extends(n, e), Object.defineProperty(n.prototype, "yc", {
            /**
             * Tracks whether or not a handshake has been successfully exchanged and
             * the stream is ready to accept mutations.
             */
            get: function() {
                return this.Vc;
            },
            enumerable: !1,
            configurable: !0
        }), 
        // Override of PersistentStream.start
        n.prototype.start = function() {
            this.Vc = !1, this.lastStreamToken = void 0, e.prototype.start.call(this);
        }, n.prototype.fc = function() {
            this.Vc && this.vc([]);
        }, n.prototype.Ic = function(t) {
            return this.ec.Ac("Write", t);
        }, n.prototype.onMessage = function(t) {
            if (
            // Always capture the last stream token.
            k$1(!!t.streamToken), this.lastStreamToken = t.streamToken, this.Vc) {
                // A successful first write response means the stream is healthy,
                // Note, that we could consider a successful handshake healthy, however,
                // the write itself might be causing an error we want to back off from.
                this.Ps.reset();
                var e = function(t, e) {
                    return t && t.length > 0 ? (k$1(void 0 !== e), t.map((function(t) {
                        return function(t, e) {
                            // NOTE: Deletes don't have an updateTime.
                            var n = t.updateTime ? le(t.updateTime) : le(e);
                            n.isEqual(z.min()) && (
                            // The Firestore Emulator currently returns an update time of 0 for
                            // deletes of non-existing documents (rather than null). This breaks the
                            // test "get deleted doc while offline with source=cache" as NoDocuments
                            // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
                            // TODO(#2149): Remove this when Emulator is fixed
                            n = le(e));
                            var r = null;
                            return t.transformResults && t.transformResults.length > 0 && (r = t.transformResults), 
                            new $e(n, r);
                        }(t, e);
                    }))) : [];
                }(t.writeResults, t.commitTime), n = le(t.commitTime);
                return this.listener.bc(n, e);
            }
            // The first response is always the handshake response
                    return k$1(!t.writeResults || 0 === t.writeResults.length), this.Vc = !0, 
            this.listener.Sc();
        }, 
        /**
         * Sends an initial streamToken to the server, performing the handshake
         * required to make the StreamingWrite RPC work. Subsequent
         * calls should wait until onHandshakeComplete was called.
         */
        n.prototype.Dc = function() {
            // TODO(dimond): Support stream resumption. We intentionally do not set the
            // stream token on the handshake, ignoring any stream token we might have.
            var t = {};
            t.database = we(this.serializer), this.lc(t);
        }, 
        /** Sends a group of mutations to the Firestore backend to apply. */ n.prototype.vc = function(t) {
            var e = this, n = {
                streamToken: this.lastStreamToken,
                writes: t.map((function(t) {
                    return Ie(e.serializer, t);
                }))
            };
            this.lc(n);
        }, n;
    }(Eo), xo = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this) || this).credentials = t, i.ec = n, i.serializer = r, i.Cc = !1, 
            i;
        }
        return __extends(n, e), n.prototype.Nc = function() {
            if (this.Cc) throw new j(F$1.FAILED_PRECONDITION, "The client has already been terminated.");
        }, 
        /** Gets an auth token and invokes the provided RPC. */ n.prototype.xc = function(t, e, n) {
            var r = this;
            return this.Nc(), this.credentials.getToken().then((function(i) {
                return r.ec.xc(t, e, n, i);
            })).catch((function(t) {
                throw t.code === F$1.UNAUTHENTICATED && r.credentials.ni(), t;
            }));
        }, 
        /** Gets an auth token and invokes the provided RPC with streamed results. */ n.prototype.Fc = function(t, e, n) {
            var r = this;
            return this.Nc(), this.credentials.getToken().then((function(i) {
                return r.ec.Fc(t, e, n, i);
            })).catch((function(t) {
                throw t.code === F$1.UNAUTHENTICATED && r.credentials.ni(), t;
            }));
        }, n.prototype.terminate = function() {
            this.Cc = !1;
        }, n;
    }((function() {})), Ao = /** @class */ function() {
        function t(t, e) {
            this.rs = t, this.Oc = e, 
            /** The current OnlineState. */
            this.state = "Unknown" /* Unknown */ , 
            /**
                 * A count of consecutive failures to open the stream. If it reaches the
                 * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
                 * Offline.
                 */
            this.Mc = 0, 
            /**
                 * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
                 * transition from OnlineState.Unknown to OnlineState.Offline without waiting
                 * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
                 */
            this.kc = null, 
            /**
                 * Whether the client should log a warning message if it fails to connect to
                 * the backend (initially true, cleared after a successful stream, or if we've
                 * logged the message already).
                 */
            this.$c = !0
            /**
         * Called by RemoteStore when a watch stream is started (including on each
         * backoff attempt).
         *
         * If this is the first attempt, it sets the OnlineState to Unknown and starts
         * the onlineStateTimer.
         */;
        }
        return t.prototype.Lc = function() {
            var t = this;
            0 === this.Mc && (this.Bc("Unknown" /* Unknown */), this.kc = this.rs.Pn("online_state_timeout" /* OnlineStateTimeout */ , 1e4, (function() {
                return t.kc = null, t.qc("Backend didn't respond within 10 seconds."), t.Bc("Offline" /* Offline */), 
                Promise.resolve();
            })));
        }, 
        /**
         * Updates our OnlineState as appropriate after the watch stream reports a
         * failure. The first failure moves us to the 'Unknown' state. We then may
         * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
         * actually transition to the 'Offline' state.
         */
        t.prototype.Uc = function(t) {
            "Online" /* Online */ === this.state ? this.Bc("Unknown" /* Unknown */) : (this.Mc++, 
            this.Mc >= 1 && (this.Qc(), this.qc("Connection failed 1 times. Most recent error: " + t.toString()), 
            this.Bc("Offline" /* Offline */)));
        }, 
        /**
         * Explicitly sets the OnlineState to the specified state.
         *
         * Note that this resets our timers / failure counters, etc. used by our
         * Offline heuristics, so must not be used in place of
         * handleWatchStreamStart() and handleWatchStreamFailure().
         */
        t.prototype.set = function(t) {
            this.Qc(), this.Mc = 0, "Online" /* Online */ === t && (
            // We've connected to watch at least once. Don't warn the developer
            // about being offline going forward.
            this.$c = !1), this.Bc(t);
        }, t.prototype.Bc = function(t) {
            t !== this.state && (this.state = t, this.Oc(t));
        }, t.prototype.qc = function(t) {
            var e = "Could not reach Cloud Firestore backend. " + t + "\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.";
            this.$c ? (N$1(e), this.$c = !1) : T$1("OnlineStateTracker", e);
        }, t.prototype.Qc = function() {
            null !== this.kc && (this.kc.cancel(), this.kc = null);
        }, t;
    }(), So = function(
    /**
         * The local store, used to fill the write pipeline with outbound mutations.
         */
    t, 
    /** The client-side proxy for interacting with the backend. */
    r, i, o, u) {
        var s = this;
        this.Kc = t, this.Wc = r, this.rs = i, this.jc = {}, 
        /**
                 * A list of up to MAX_PENDING_WRITES writes that we have fetched from the
                 * LocalStore via fillWritePipeline() and have or will send to the write
                 * stream.
                 *
                 * Whenever writePipeline.length > 0 the RemoteStore will attempt to start or
                 * restart the write stream. When the stream is established the writes in the
                 * pipeline will be sent in order.
                 *
                 * Writes remain in writePipeline until they are acknowledged by the backend
                 * and thus will automatically be re-sent if the stream is interrupted /
                 * restarted before they're acknowledged.
                 *
                 * Write responses from the backend are linked to their originating request
                 * purely based on order, and so we can just shift() writes from the front of
                 * the writePipeline as we receive responses.
                 */
        this.Gc = [], 
        /**
                 * A mapping of watched targets that the client cares about tracking and the
                 * user has explicitly called a 'listen' for this target.
                 *
                 * These targets may or may not have been sent to or acknowledged by the
                 * server. On re-establishing the listen stream, these targets should be sent
                 * to the server. The targets removed with unlistens are removed eagerly
                 * without waiting for confirmation from the listen stream.
                 */
        this.zc = new Map, 
        /**
                 * A set of reasons for why the RemoteStore may be offline. If empty, the
                 * RemoteStore may start its network connections.
                 */
        this.Hc = new Set, 
        /**
                 * Event handlers that get called when the network is disabled or enabled.
                 *
                 * PORTING NOTE: These functions are used on the Web client to create the
                 * underlying streams (to support tree-shakeable streams). On Android and iOS,
                 * the streams are created during construction of RemoteStore.
                 */
        this.Jc = [], this.Yc = u, this.Yc.Xc((function(t) {
            i.fs((function() {
                return __awaiter(s, void 0, void 0, (function() {
                    return __generator(this, (function(t) {
                        switch (t.label) {
                          case 0:
                            return Mo(this) ? (T$1("RemoteStore", "Restarting streams for network reachability change."), 
                            [ 4 /*yield*/ , function(t) {
                                return __awaiter(this, void 0, void 0, (function() {
                                    var e;
                                    return __generator(this, (function(n) {
                                        switch (n.label) {
                                          case 0:
                                            return (e = D$1(t)).Hc.add(4 /* ConnectivityChange */), [ 4 /*yield*/ , Do(e) ];

                                          case 1:
                                            return n.sent(), e.Zc.set("Unknown" /* Unknown */), e.Hc.delete(4 /* ConnectivityChange */), 
                                            [ 4 /*yield*/ , ko(e) ];

                                          case 2:
                                            return n.sent(), [ 2 /*return*/ ];
                                        }
                                    }));
                                }));
                            }(this) ]) : [ 3 /*break*/ , 2 ];

                          case 1:
                            t.sent(), t.label = 2;

                          case 2:
                            return [ 2 /*return*/ ];
                        }
                    }));
                }));
            }));
        })), this.Zc = new Ao(i, o);
    };

    /**
     * A PersistentStream that implements the Listen RPC.
     *
     * Once the Listen stream has called the onOpen() listener, any number of
     * listen() and unlisten() calls can be made to control what changes will be
     * sent from the server for ListenResponses.
     */ function ko(t) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, r;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    if (!Mo(t)) return [ 3 /*break*/ , 4 ];
                    e = 0, r = t.Jc, n.label = 1;

                  case 1:
                    return e < r.length ? [ 4 /*yield*/ , (0, r[e])(/* enabled= */ !0) ] : [ 3 /*break*/ , 4 ];

                  case 2:
                    n.sent(), n.label = 3;

                  case 3:
                    return e++, [ 3 /*break*/ , 1 ];

                  case 4:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Temporarily disables the network. The network can be re-enabled using
     * enableNetwork().
     */ function Do(t) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, r;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    e = 0, r = t.Jc, n.label = 1;

                  case 1:
                    return e < r.length ? [ 4 /*yield*/ , (0, r[e])(/* enabled= */ !1) ] : [ 3 /*break*/ , 4 ];

                  case 2:
                    n.sent(), n.label = 3;

                  case 3:
                    return e++, [ 3 /*break*/ , 1 ];

                  case 4:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Starts new listen for the given target. Uses resume token if provided. It
     * is a no-op if the target of given `TargetData` is already being listened to.
     */ function Oo(t, e) {
        var n = D$1(t);
        n.zc.has(e.targetId) || (
        // Mark this as something the client is currently listening for.
        n.zc.set(e.targetId, e), Ro(n) ? 
        // The listen will be sent in onWatchStreamOpen
        Lo(n) : $o(n).oc() && Vo(n, e));
    }

    /**
     * Removes the listen from server. It is a no-op if the given target id is
     * not being listened to.
     */ function Po(t, e) {
        var n = D$1(t), r = $o(n);
        n.zc.delete(e), r.oc() && Co(n, e), 0 === n.zc.size && (r.oc() ? r.uc() : Mo(n) && 
        // Revert to OnlineState.Unknown if the watch stream is not open and we
        // have no listeners, since without any listens to send we cannot
        // confirm if the stream is healthy and upgrade to OnlineState.Online.
        n.Zc.set("Unknown" /* Unknown */));
    }

    /**
     * We need to increment the the expected number of pending responses we're due
     * from watch so we wait for the ack to process any messages from this target.
     */ function Vo(t, e) {
        t.tu.Ie(e.targetId), $o(t).Pc(e)
        /**
     * We need to increment the expected number of pending responses we're due
     * from watch so we wait for the removal on the server before we process any
     * messages from this target.
     */;
    }

    function Co(t, e) {
        t.tu.Ie(e), $o(t).gc(e);
    }

    function Lo(t) {
        t.tu = new Ct({
            Be: function(e) {
                return t.jc.Be(e);
            },
            qe: function(e) {
                return t.zc.get(e) || null;
            }
        }), $o(t).start(), t.Zc.Lc()
        /**
     * Returns whether the watch stream should be started because it's necessary
     * and has not yet been started.
     */;
    }

    function Ro(t) {
        return Mo(t) && !$o(t).rc() && t.zc.size > 0;
    }

    function Mo(t) {
        return 0 === D$1(t).Hc.size;
    }

    function Uo(t) {
        t.tu = void 0;
    }

    function qo(t) {
        return __awaiter(this, void 0, void 0, (function() {
            return __generator(this, (function(e) {
                return t.zc.forEach((function(e, n) {
                    Vo(t, e);
                })), [ 2 /*return*/ ];
            }));
        }));
    }

    function Fo(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            return __generator(this, (function(e) {
                return Uo(t), 
                // If we still need the watch stream, retry the connection.
                Ro(t) ? (t.Zc.Uc(r), Lo(t)) : 
                // No need to restart watch stream because there are no active targets.
                // The online state is set to unknown because there is no active attempt
                // at establishing a connection
                t.Zc.set("Unknown" /* Unknown */), [ 2 /*return*/ ];
            }));
        }));
    }

    function jo(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var o, u, s;
            return __generator(this, (function(a) {
                switch (a.label) {
                  case 0:
                    if (t.Zc.set("Online" /* Online */), !(r instanceof Pt && 2 /* Removed */ === r.state && r.cause)) 
                    // Mark the client as online since we got a message from the server
                    return [ 3 /*break*/ , 6 ];
                    a.label = 1;

                  case 1:
                    return a.trys.push([ 1, 3, , 5 ]), [ 4 /*yield*/ , 
                    /** Handles an error on a target */
                    function(t, r) {
                        return __awaiter(this, void 0, void 0, (function() {
                            var e, i, o, u;
                            return __generator(this, (function(n) {
                                switch (n.label) {
                                  case 0:
                                    e = r.cause, i = 0, o = r.targetIds, n.label = 1;

                                  case 1:
                                    return i < o.length ? (u = o[i], t.zc.has(u) ? [ 4 /*yield*/ , t.jc.eu(u, e) ] : [ 3 /*break*/ , 3 ]) : [ 3 /*break*/ , 5 ];

                                  case 2:
                                    n.sent(), t.zc.delete(u), t.tu.removeTarget(u), n.label = 3;

                                  case 3:
                                    n.label = 4;

                                  case 4:
                                    return i++, [ 3 /*break*/ , 1 ];

                                  case 5:
                                    return [ 2 /*return*/ ];
                                }
                            }));
                        }));
                    }(t, r) ];

                  case 2:
                    return a.sent(), [ 3 /*break*/ , 5 ];

                  case 3:
                    return o = a.sent(), T$1("RemoteStore", "Failed to remove targets %s: %s ", r.targetIds.join(","), o), 
                    [ 4 /*yield*/ , Bo(t, o) ];

                  case 4:
                    return a.sent(), [ 3 /*break*/ , 5 ];

                  case 5:
                    return [ 3 /*break*/ , 13 ];

                  case 6:
                    if (r instanceof Dt ? t.tu.pe(r) : r instanceof Ot ? t.tu.Fe(r) : t.tu.Se(r), i.isEqual(z.min())) return [ 3 /*break*/ , 13 ];
                    a.label = 7;

                  case 7:
                    return a.trys.push([ 7, 11, , 13 ]), [ 4 /*yield*/ , lo(t.Kc) ];

                  case 8:
                    return u = a.sent(), i.A(u) >= 0 ? [ 4 /*yield*/ , 
                    /**
                     * Takes a batch of changes from the Datastore, repackages them as a
                     * RemoteEvent, and passes that on to the listener, which is typically the
                     * SyncEngine.
                     */
                    function(t, e) {
                        var n = t.tu.ke(e);
                        // Update in-memory resume tokens. LocalStore will update the
                        // persistent view of these when applying the completed RemoteEvent.
                                            return n.Gt.forEach((function(n, r) {
                            if (n.resumeToken.X() > 0) {
                                var i = t.zc.get(r);
                                // A watched target might have been removed already.
                                                            i && t.zc.set(r, i.st(n.resumeToken, e));
                            }
                        })), 
                        // Re-establish listens for the targets that have been invalidated by
                        // existence filter mismatches.
                        n.zt.forEach((function(e) {
                            var n = t.zc.get(e);
                            if (n) {
                                // Clear the resume token for the target, since we're in a known mismatch
                                // state.
                                t.zc.set(e, n.st(rt.Z, n.et)), 
                                // Cause a hard reset by unwatching and rewatching immediately, but
                                // deliberately don't send a resume token so that we get a full update.
                                Co(t, e);
                                // Mark the target we send as being on behalf of an existence filter
                                // mismatch, but don't actually retain that in listenTargets. This ensures
                                // that we flag the first re-listen this way without impacting future
                                // listens of this target (that might happen e.g. on reconnect).
                                var r = new ut(n.target, e, 1 /* ExistenceFilterMismatch */ , n.sequenceNumber);
                                Vo(t, r);
                            }
                        })), t.jc.nu(n);
                    }(t, i) ] : [ 3 /*break*/ , 10 ];

                    // We have received a target change with a global snapshot if the snapshot
                    // version is not equal to SnapshotVersion.min().
                                  case 9:
                    // We have received a target change with a global snapshot if the snapshot
                    // version is not equal to SnapshotVersion.min().
                    a.sent(), a.label = 10;

                  case 10:
                    return [ 3 /*break*/ , 13 ];

                  case 11:
                    return T$1("RemoteStore", "Failed to raise snapshot:", s = a.sent()), [ 4 /*yield*/ , Bo(t, s) ];

                  case 12:
                    return a.sent(), [ 3 /*break*/ , 13 ];

                  case 13:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Recovery logic for IndexedDB errors that takes the network offline until
     * `op` succeeds. Retries are scheduled with backoff using
     * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
     * validated via a generic operation.
     *
     * The returned Promise is resolved once the network is disabled and before
     * any retry attempt.
     */ function Bo(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var o = this;
            return __generator(this, (function(u) {
                switch (u.label) {
                  case 0:
                    if (!cr(r)) throw r;
                    // Disable network and raise offline snapshots
                    return t.Hc.add(1 /* IndexedDbFailed */), [ 4 /*yield*/ , Do(t) ];

                  case 1:
                    // Disable network and raise offline snapshots
                    return u.sent(), t.Zc.set("Offline" /* Offline */), i || (
                    // Use a simple read operation to determine if IndexedDB recovered.
                    // Ideally, we would expose a health check directly on SimpleDb, but
                    // RemoteStore only has access to persistence through LocalStore.
                    i = function() {
                        return lo(t.Kc);
                    }), 
                    // Probe IndexedDB periodically and re-enable network
                    t.rs.Ss((function() {
                        return __awaiter(o, void 0, void 0, (function() {
                            return __generator(this, (function(e) {
                                switch (e.label) {
                                  case 0:
                                    return T$1("RemoteStore", "Retrying IndexedDB access"), [ 4 /*yield*/ , i() ];

                                  case 1:
                                    return e.sent(), t.Hc.delete(1 /* IndexedDbFailed */), [ 4 /*yield*/ , ko(t) ];

                                  case 2:
                                    return e.sent(), [ 2 /*return*/ ];
                                }
                            }));
                        }));
                    })), [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Executes `op`. If `op` fails, takes the network offline until `op`
     * succeeds. Returns after the first attempt.
     */ function zo(t, e) {
        return e().catch((function(n) {
            return Bo(t, n, e);
        }));
    }

    function Go(t) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, r, i, o, u;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    e = D$1(t), r = Zo(e), i = e.Gc.length > 0 ? e.Gc[e.Gc.length - 1].batchId : -1, n.label = 1;

                  case 1:
                    if (!
                    /**
     * Returns true if we can add to the write pipeline (i.e. the network is
     * enabled and the write pipeline is not full).
     */
                    function(t) {
                        return Mo(t) && t.Gc.length < 10;
                    }
                    /**
     * Queues additional writes to be sent to the write stream, sending them
     * immediately if the write stream is established.
     */ (e)) return [ 3 /*break*/ , 7 ];
                    n.label = 2;

                  case 2:
                    return n.trys.push([ 2, 4, , 6 ]), [ 4 /*yield*/ , vo(e.Kc, i) ];

                  case 3:
                    return null === (o = n.sent()) ? (0 === e.Gc.length && r.uc(), [ 3 /*break*/ , 7 ]) : (i = o.batchId, 
                    function(t, e) {
                        t.Gc.push(e);
                        var n = Zo(t);
                        n.oc() && n.yc && n.vc(e.mutations);
                    }(e, o), [ 3 /*break*/ , 6 ]);

                  case 4:
                    return u = n.sent(), [ 4 /*yield*/ , Bo(e, u) ];

                  case 5:
                    return n.sent(), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 3 /*break*/ , 1 ];

                  case 7:
                    return Ko(e) && Qo(e), [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function Ko(t) {
        return Mo(t) && !Zo(t).rc() && t.Gc.length > 0;
    }

    function Qo(t) {
        Zo(t).start();
    }

    function Wo(t) {
        return __awaiter(this, void 0, void 0, (function() {
            return __generator(this, (function(e) {
                return Zo(t).Dc(), [ 2 /*return*/ ];
            }));
        }));
    }

    function Yo(t) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, r, i, o;
            return __generator(this, (function(n) {
                // Send the write pipeline now that the stream is established.
                for (e = Zo(t), r = 0, i = t.Gc; r < i.length; r++) o = i[r], e.vc(o.mutations);
                return [ 2 /*return*/ ];
            }));
        }));
    }

    function Ho(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, o;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return e = t.Gc.shift(), o = Lr.from(e, r, i), [ 4 /*yield*/ , zo(t, (function() {
                        return t.jc.su(o);
                    })) ];

                  case 1:
                    // It's possible that with the completion of this mutation another
                    // slot has freed up.
                    return n.sent(), [ 4 /*yield*/ , Go(t) ];

                  case 2:
                    // It's possible that with the completion of this mutation another
                    // slot has freed up.
                    return n.sent(), [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function Jo(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            return __generator(this, (function(i) {
                switch (i.label) {
                  case 0:
                    return r && Zo(t).yc ? [ 4 /*yield*/ , function(t, r) {
                        return __awaiter(this, void 0, void 0, (function() {
                            var e, i;
                            return __generator(this, (function(n) {
                                switch (n.label) {
                                  case 0:
                                    return at(i = r.code) && i !== F$1.ABORTED ? (e = t.Gc.shift(), 
                                    // In this case it's also unlikely that the server itself is melting
                                    // down -- this was just a bad request so inhibit backoff on the next
                                    // restart.
                                    Zo(t).cc(), [ 4 /*yield*/ , zo(t, (function() {
                                        return t.jc.iu(e.batchId, r);
                                    })) ]) : [ 3 /*break*/ , 3 ];

                                  case 1:
                                    // It's possible that with the completion of this mutation
                                    // another slot has freed up.
                                    return n.sent(), [ 4 /*yield*/ , Go(t) ];

                                  case 2:
                                    // In this case it's also unlikely that the server itself is melting
                                    // down -- this was just a bad request so inhibit backoff on the next
                                    // restart.
                                    // It's possible that with the completion of this mutation
                                    // another slot has freed up.
                                    n.sent(), n.label = 3;

                                  case 3:
                                    return [ 2 /*return*/ ];
                                }
                            }));
                        }));
                    }(t, r) ] : [ 3 /*break*/ , 2 ];

                    // This error affects the actual write.
                                  case 1:
                    // This error affects the actual write.
                    i.sent(), i.label = 2;

                  case 2:
                    // If the write stream closed after the write handshake completes, a write
                    // operation failed and we fail the pending operation.
                    // The write stream might have been started by refilling the write
                    // pipeline for failed writes
                    return Ko(t) && Qo(t), [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Toggles the network state when the client gains or loses its primary lease.
     */ function Xo(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return e = D$1(t), r ? (e.Hc.delete(2 /* IsSecondary */), [ 4 /*yield*/ , ko(e) ]) : [ 3 /*break*/ , 2 ];

                  case 1:
                    return n.sent(), [ 3 /*break*/ , 5 ];

                  case 2:
                    return (i = r) ? [ 3 /*break*/ , 4 ] : (e.Hc.add(2 /* IsSecondary */), [ 4 /*yield*/ , Do(e) ]);

                  case 3:
                    n.sent(), i = e.Zc.set("Unknown" /* Unknown */), n.label = 4;

                  case 4:
                    n.label = 5;

                  case 5:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * If not yet initialized, registers the WatchStream and its network state
     * callback with `remoteStoreImpl`. Returns the existing stream if one is
     * already available.
     *
     * PORTING NOTE: On iOS and Android, the WatchStream gets registered on startup.
     * This is not done on Web to allow it to be tree-shaken.
     */ function $o(t) {
        var r = this;
        return t.ru || (
        // Create stream (but note that it is not started yet).
        t.ru = function(t, e, n) {
            var r = D$1(t);
            return r.Nc(), new To(e, r.ec, r.credentials, r.serializer, n);
        }(t.Wc, t.rs, {
            mc: qo.bind(null, t),
            dc: Fo.bind(null, t),
            Rc: jo.bind(null, t)
        }), t.Jc.push((function(i) {
            return __awaiter(r, void 0, void 0, (function() {
                return __generator(this, (function(e) {
                    switch (e.label) {
                      case 0:
                        return i ? (t.ru.cc(), Ro(t) ? Lo(t) : t.Zc.set("Unknown" /* Unknown */), [ 3 /*break*/ , 3 ]) : [ 3 /*break*/ , 1 ];

                      case 1:
                        return [ 4 /*yield*/ , t.ru.stop() ];

                      case 2:
                        e.sent(), Uo(t), e.label = 3;

                      case 3:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }))), t.ru
        /**
     * If not yet initialized, registers the WriteStream and its network state
     * callback with `remoteStoreImpl`. Returns the existing stream if one is
     * already available.
     *
     * PORTING NOTE: On iOS and Android, the WriteStream gets registered on startup.
     * This is not done on Web to allow it to be tree-shaken.
     */;
    }

    function Zo(t) {
        var r = this;
        return t.ou || (
        // Create stream (but note that it is not started yet).
        t.ou = function(t, e, n) {
            var r = D$1(t);
            return r.Nc(), new No(e, r.ec, r.credentials, r.serializer, n);
        }(t.Wc, t.rs, {
            mc: Wo.bind(null, t),
            dc: Jo.bind(null, t),
            Sc: Yo.bind(null, t),
            bc: Ho.bind(null, t)
        }), t.Jc.push((function(i) {
            return __awaiter(r, void 0, void 0, (function() {
                return __generator(this, (function(e) {
                    switch (e.label) {
                      case 0:
                        return i ? (t.ou.cc(), [ 4 /*yield*/ , Go(t) ]) : [ 3 /*break*/ , 2 ];

                      case 1:
                        // This will start the write stream if necessary.
                        return e.sent(), [ 3 /*break*/ , 4 ];

                      case 2:
                        return [ 4 /*yield*/ , t.ou.stop() ];

                      case 3:
                        e.sent(), t.Gc.length > 0 && (T$1("RemoteStore", "Stopping write stream with " + t.Gc.length + " pending writes"), 
                        t.Gc = []), e.label = 4;

                      case 4:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }))), t.ou
        /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
        /**
     * A collection of references to a document from some kind of numbered entity
     * (either a target ID or batch ID). As references are added to or removed from
     * the set corresponding events are emitted to a registered garbage collector.
     *
     * Each reference is represented by a DocumentReference object. Each of them
     * contains enough information to uniquely identify the reference. They are all
     * stored primarily in a set sorted by key. A document is considered garbage if
     * there's no references in that set (this can be efficiently checked thanks to
     * sorting by key).
     *
     * ReferenceSet also keeps a secondary set that contains references sorted by
     * IDs. This one is used to efficiently implement removal of all references by
     * some target ID.
     */;
    }

    var tu = /** @class */ function() {
        function t() {
            // A set of outstanding references to a document sorted by key.
            this.au = new pt(eu.cu), 
            // A set of outstanding references to a document sorted by target id.
            this.uu = new pt(eu.hu)
            /** Returns true if the reference set contains no references. */;
        }
        return t.prototype.T = function() {
            return this.au.T();
        }, 
        /** Adds a reference to the given document key for the given ID. */ t.prototype.Qo = function(t, e) {
            var n = new eu(t, e);
            this.au = this.au.add(n), this.uu = this.uu.add(n);
        }, 
        /** Add references to the given document keys for the given ID. */ t.prototype.lu = function(t, e) {
            var n = this;
            t.forEach((function(t) {
                return n.Qo(t, e);
            }));
        }, 
        /**
         * Removes a reference to the given document key for the given
         * ID.
         */
        t.prototype.Wo = function(t, e) {
            this._u(new eu(t, e));
        }, t.prototype.fu = function(t, e) {
            var n = this;
            t.forEach((function(t) {
                return n.Wo(t, e);
            }));
        }, 
        /**
         * Clears all references with a given ID. Calls removeRef() for each key
         * removed.
         */
        t.prototype.du = function(t) {
            var e = this, n = new Y$1(new K$1([])), r = new eu(n, t), i = new eu(n, t + 1), o = [];
            return this.uu.Nt([ r, i ], (function(t) {
                e._u(t), o.push(t.key);
            })), o;
        }, t.prototype.wu = function() {
            var t = this;
            this.au.forEach((function(e) {
                return t._u(e);
            }));
        }, t.prototype._u = function(t) {
            this.au = this.au.delete(t), this.uu = this.uu.delete(t);
        }, t.prototype.Tu = function(t) {
            var e = new Y$1(new K$1([])), n = new eu(e, t), r = new eu(e, t + 1), i = It();
            return this.uu.Nt([ n, r ], (function(t) {
                i = i.add(t.key);
            })), i;
        }, t.prototype.so = function(t) {
            var e = new eu(t, 0), n = this.au.Ft(e);
            return null !== n && t.isEqual(n.key);
        }, t;
    }(), eu = /** @class */ function() {
        function t(t, e) {
            this.key = t, this.Eu = e
            /** Compare by key then by ID */;
        }
        return t.cu = function(t, e) {
            return Y$1.V(t.key, e.key) || V$1(t.Eu, e.Eu);
        }, 
        /** Compare by ID then by key */ t.hu = function(t, e) {
            return V$1(t.Eu, e.Eu) || Y$1.V(t.key, e.key);
        }, t;
    }();

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // The format of the LocalStorage key that stores the client state is:
    //     firestore_clients_<persistence_prefix>_<instance_key>
    /** Assembles the key for a client state in WebStorage */
    function nu(t, e) {
        return "firestore_clients_" + t + "_" + e;
    }

    // The format of the WebStorage key that stores the mutation state is:
    //     firestore_mutations_<persistence_prefix>_<batch_id>
    //     (for unauthenticated users)
    // or: firestore_mutations_<persistence_prefix>_<batch_id>_<user_uid>
    // 'user_uid' is last to avoid needing to escape '_' characters that it might
    // contain.
    /** Assembles the key for a mutation batch in WebStorage */ function ru(t, e, n) {
        var r = "firestore_mutations_" + t + "_" + n;
        return e.Js() && (r += "_" + e.uid), r;
    }

    // The format of the WebStorage key that stores a query target's metadata is:
    //     firestore_targets_<persistence_prefix>_<target_id>
    /** Assembles the key for a query state in WebStorage */ function iu(t, e) {
        return "firestore_targets_" + t + "_" + e;
    }

    // The WebStorage prefix that stores the primary tab's online state. The
    // format of the key is:
    //     firestore_online_state_<persistence_prefix>
    /**
     * Holds the state of a mutation batch, including its user ID, batch ID and
     * whether the batch is 'pending', 'acknowledged' or 'rejected'.
     */
    // Visible for testing
    var ou = /** @class */ function() {
        function t(t, e, n, r) {
            this.user = t, this.batchId = e, this.state = n, this.error = r
            /**
         * Parses a MutationMetadata from its JSON representation in WebStorage.
         * Logs a warning and returns null if the format of the data is not valid.
         */;
        }
        return t.Iu = function(e, n, r) {
            var i = JSON.parse(r), o = "object" == typeof i && -1 !== [ "pending", "acknowledged", "rejected" ].indexOf(i.state) && (void 0 === i.error || "object" == typeof i.error), u = void 0;
            return o && i.error && ((o = "string" == typeof i.error.message && "string" == typeof i.error.code) && (u = new j(i.error.code, i.error.message))), 
            o ? new t(e, n, i.state, u) : (N$1("SharedClientState", "Failed to parse mutation state for ID '" + n + "': " + r), 
            null);
        }, t.prototype.mu = function() {
            var t = {
                state: this.state,
                updateTimeMs: Date.now()
            };
            return this.error && (t.error = {
                code: this.error.code,
                message: this.error.message
            }), JSON.stringify(t);
        }, t;
    }(), uu = /** @class */ function() {
        function t(t, e, n) {
            this.targetId = t, this.state = e, this.error = n
            /**
         * Parses a QueryTargetMetadata from its JSON representation in WebStorage.
         * Logs a warning and returns null if the format of the data is not valid.
         */;
        }
        return t.Iu = function(e, n) {
            var r = JSON.parse(n), i = "object" == typeof r && -1 !== [ "not-current", "current", "rejected" ].indexOf(r.state) && (void 0 === r.error || "object" == typeof r.error), o = void 0;
            return i && r.error && ((i = "string" == typeof r.error.message && "string" == typeof r.error.code) && (o = new j(r.error.code, r.error.message))), 
            i ? new t(e, r.state, o) : (N$1("SharedClientState", "Failed to parse target state for ID '" + e + "': " + n), 
            null);
        }, t.prototype.mu = function() {
            var t = {
                state: this.state,
                updateTimeMs: Date.now()
            };
            return this.error && (t.error = {
                code: this.error.code,
                message: this.error.message
            }), JSON.stringify(t);
        }, t;
    }(), su = /** @class */ function() {
        function t(t, e) {
            this.clientId = t, this.activeTargetIds = e
            /**
         * Parses a RemoteClientState from the JSON representation in WebStorage.
         * Logs a warning and returns null if the format of the data is not valid.
         */;
        }
        return t.Iu = function(e, n) {
            for (var r = JSON.parse(n), i = "object" == typeof r && r.activeTargetIds instanceof Array, o = Tt(), u = 0; i && u < r.activeTargetIds.length; ++u) i = X$1(r.activeTargetIds[u]), 
            o = o.add(r.activeTargetIds[u]);
            return i ? new t(e, o) : (N$1("SharedClientState", "Failed to parse client data for instance '" + e + "': " + n), 
            null);
        }, t;
    }(), au = /** @class */ function() {
        function t(t, e) {
            this.clientId = t, this.onlineState = e
            /**
         * Parses a SharedOnlineState from its JSON representation in WebStorage.
         * Logs a warning and returns null if the format of the data is not valid.
         */;
        }
        return t.Iu = function(e) {
            var n = JSON.parse(e);
            return "object" == typeof n && -1 !== [ "Unknown", "Online", "Offline" ].indexOf(n.onlineState) && "string" == typeof n.clientId ? new t(n.clientId, n.onlineState) : (N$1("SharedClientState", "Failed to parse online state: " + e), 
            null);
        }, t;
    }(), cu = /** @class */ function() {
        function t() {
            this.activeTargetIds = Tt();
        }
        return t.prototype.Au = function(t) {
            this.activeTargetIds = this.activeTargetIds.add(t);
        }, t.prototype.Ru = function(t) {
            this.activeTargetIds = this.activeTargetIds.delete(t);
        }, 
        /**
         * Converts this entry into a JSON-encoded format we can use for WebStorage.
         * Does not encode `clientId` as it is part of the key in WebStorage.
         */
        t.prototype.mu = function() {
            var t = {
                activeTargetIds: this.activeTargetIds.O(),
                updateTimeMs: Date.now()
            };
            return JSON.stringify(t);
        }, t;
    }(), hu = /** @class */ function() {
        function t(t, e, n, r, i) {
            this.window = t, this.ln = e, this.persistenceKey = n, this.Pu = r, this.gu = null, 
            this.Oc = null, this.Xi = null, this.Vu = this.yu.bind(this), this.pu = new ht(V$1), 
            this.yr = !1, 
            /**
                 * Captures WebStorage events that occur before `start()` is called. These
                 * events are replayed once `WebStorageSharedClientState` is started.
                 */
            this.vu = [];
            // Escape the special characters mentioned here:
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
            var o = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            this.storage = this.window.localStorage, this.currentUser = i, this.bu = nu(this.persistenceKey, this.Pu), 
            this.Su = 
            /** Assembles the key for the current sequence number. */
            function(t) {
                return "firestore_sequence_number_" + t;
            }(this.persistenceKey), this.pu = this.pu.rt(this.Pu, new cu), this.Du = new RegExp("^firestore_clients_" + o + "_([^_]*)$"), 
            this.Cu = new RegExp("^firestore_mutations_" + o + "_(\\d+)(?:_(.*))?$"), this.Nu = new RegExp("^firestore_targets_" + o + "_(\\d+)$"), 
            this.xu = 
            /** Assembles the key for the online state of the primary tab. */
            function(t) {
                return "firestore_online_state_" + t;
            }(this.persistenceKey), this.Fu = function(t) {
                return "firestore_bundle_loaded_" + t;
            }(this.persistenceKey), 
            // Rather than adding the storage observer during start(), we add the
            // storage observer during initialization. This ensures that we collect
            // events before other components populate their initial state (during their
            // respective start() calls). Otherwise, we might for example miss a
            // mutation that is added after LocalStore's start() processed the existing
            // mutations but before we observe WebStorage events.
            this.window.addEventListener("storage", this.Vu);
        }
        /** Returns 'true' if WebStorage is available in the current environment. */    return t.kn = function(t) {
            return !(!t || !t.localStorage);
        }, t.prototype.start = function() {
            return __awaiter(this, void 0, void 0, (function() {
                var t, e, r, i, o, u, s, a, c, h, f, l = this;
                return __generator(this, (function(n) {
                    switch (n.label) {
                      case 0:
                        return [ 4 /*yield*/ , this.gu.Ca() ];

                      case 1:
                        for (t = n.sent(), e = 0, r = t; e < r.length; e++) (i = r[e]) !== this.Pu && (o = this.getItem(nu(this.persistenceKey, i))) && (u = su.Iu(i, o)) && (this.pu = this.pu.rt(u.clientId, u));
                        for (this.Ou(), (s = this.storage.getItem(this.xu)) && (a = this.Mu(s)) && this.ku(a), 
                        c = 0, h = this.vu; c < h.length; c++) f = h[c], this.yu(f);
                        return this.vu = [], 
                        // Register a window unload hook to remove the client metadata entry from
                        // WebStorage even if `shutdown()` was not called.
                        this.window.addEventListener("unload", (function() {
                            return l.pa();
                        })), this.yr = !0, [ 2 /*return*/ ];
                    }
                }));
            }));
        }, t.prototype.er = function(t) {
            this.setItem(this.Su, JSON.stringify(t));
        }, t.prototype.$u = function() {
            return this.Lu(this.pu);
        }, t.prototype.Bu = function(t) {
            var e = !1;
            return this.pu.forEach((function(n, r) {
                r.activeTargetIds.has(t) && (e = !0);
            })), e;
        }, t.prototype.qu = function(t) {
            this.Uu(t, "pending");
        }, t.prototype.Qu = function(t, e, n) {
            this.Uu(t, e, n), 
            // Once a final mutation result is observed by other clients, they no longer
            // access the mutation's metadata entry. Since WebStorage replays events
            // in order, it is safe to delete the entry right after updating it.
            this.Ku(t);
        }, t.prototype.Wu = function(t) {
            var e = "not-current";
            // Lookup an existing query state if the target ID was already registered
            // by another tab
                    if (this.Bu(t)) {
                var n = this.storage.getItem(iu(this.persistenceKey, t));
                if (n) {
                    var r = uu.Iu(t, n);
                    r && (e = r.state);
                }
            }
            return this.ju.Au(t), this.Ou(), e;
        }, t.prototype.Gu = function(t) {
            this.ju.Ru(t), this.Ou();
        }, t.prototype.zu = function(t) {
            return this.ju.activeTargetIds.has(t);
        }, t.prototype.Hu = function(t) {
            this.removeItem(iu(this.persistenceKey, t));
        }, t.prototype.Ju = function(t, e, n) {
            this.Yu(t, e, n);
        }, t.prototype.Xu = function(t, e, n) {
            var r = this;
            e.forEach((function(t) {
                r.Ku(t);
            })), this.currentUser = t, n.forEach((function(t) {
                r.qu(t);
            }));
        }, t.prototype.Zu = function(t) {
            this.th(t);
        }, t.prototype.eh = function() {
            this.nh();
        }, t.prototype.pa = function() {
            this.yr && (this.window.removeEventListener("storage", this.Vu), this.removeItem(this.bu), 
            this.yr = !1);
        }, t.prototype.getItem = function(t) {
            var e = this.storage.getItem(t);
            return T$1("SharedClientState", "READ", t, e), e;
        }, t.prototype.setItem = function(t, e) {
            T$1("SharedClientState", "SET", t, e), this.storage.setItem(t, e);
        }, t.prototype.removeItem = function(t) {
            T$1("SharedClientState", "REMOVE", t), this.storage.removeItem(t);
        }, t.prototype.yu = function(t) {
            var r = this, i = t;
            // Note: The function is typed to take Event to be interface-compatible with
            // `Window.addEventListener`.
                    if (i.storageArea === this.storage) {
                if (T$1("SharedClientState", "EVENT", i.key, i.newValue), i.key === this.bu) return void N$1("Received WebStorage notification for local change. Another client might have garbage-collected our state");
                this.ln.Ss((function() {
                    return __awaiter(r, void 0, void 0, (function() {
                        var t, e, r, o, u, s;
                        return __generator(this, (function(n) {
                            if (this.yr) {
                                if (null !== i.key) if (this.Du.test(i.key)) {
                                    if (null == i.newValue) return t = this.sh(i.key), [ 2 /*return*/ , this.ih(t, null) ];
                                    if (e = this.rh(i.key, i.newValue)) return [ 2 /*return*/ , this.ih(e.clientId, e) ];
                                } else if (this.Cu.test(i.key)) {
                                    if (null !== i.newValue && (r = this.oh(i.key, i.newValue))) return [ 2 /*return*/ , this.ah(r) ];
                                } else if (this.Nu.test(i.key)) {
                                    if (null !== i.newValue && (o = this.uh(i.key, i.newValue))) return [ 2 /*return*/ , this.hh(o) ];
                                } else if (i.key === this.xu) {
                                    if (null !== i.newValue && (u = this.Mu(i.newValue))) return [ 2 /*return*/ , this.ku(u) ];
                                } else if (i.key === this.Su) (s = function(t) {
                                    var e = zr.nr;
                                    if (null != t) try {
                                        var n = JSON.parse(t);
                                        k$1("number" == typeof n), e = n;
                                    } catch (t) {
                                        N$1("SharedClientState", "Failed to read sequence number from WebStorage", t);
                                    }
                                    return e;
                                }(i.newValue)) !== zr.nr && this.Xi(s); else if (i.key === this.Fu) return [ 2 /*return*/ , this.gu.lh() ];
                            } else this.vu.push(i);
                            return [ 2 /*return*/ ];
                        }));
                    }));
                }));
            }
        }, Object.defineProperty(t.prototype, "ju", {
            get: function() {
                return this.pu.get(this.Pu);
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.Ou = function() {
            this.setItem(this.bu, this.ju.mu());
        }, t.prototype.Uu = function(t, e, n) {
            var r = new ou(this.currentUser, t, e, n), i = ru(this.persistenceKey, this.currentUser, t);
            this.setItem(i, r.mu());
        }, t.prototype.Ku = function(t) {
            var e = ru(this.persistenceKey, this.currentUser, t);
            this.removeItem(e);
        }, t.prototype.th = function(t) {
            var e = {
                clientId: this.Pu,
                onlineState: t
            };
            this.storage.setItem(this.xu, JSON.stringify(e));
        }, t.prototype.Yu = function(t, e, n) {
            var r = iu(this.persistenceKey, t), i = new uu(t, e, n);
            this.setItem(r, i.mu());
        }, t.prototype.nh = function() {
            this.setItem(this.Fu, "value-not-used");
        }, 
        /**
         * Parses a client state key in WebStorage. Returns null if the key does not
         * match the expected key format.
         */
        t.prototype.sh = function(t) {
            var e = this.Du.exec(t);
            return e ? e[1] : null;
        }, 
        /**
         * Parses a client state in WebStorage. Returns 'null' if the value could not
         * be parsed.
         */
        t.prototype.rh = function(t, e) {
            var n = this.sh(t);
            return su.Iu(n, e);
        }, 
        /**
         * Parses a mutation batch state in WebStorage. Returns 'null' if the value
         * could not be parsed.
         */
        t.prototype.oh = function(t, e) {
            var n = this.Cu.exec(t), r = Number(n[1]), i = void 0 !== n[2] ? n[2] : null;
            return ou.Iu(new Sr(i), r, e);
        }, 
        /**
         * Parses a query target state from WebStorage. Returns 'null' if the value
         * could not be parsed.
         */
        t.prototype.uh = function(t, e) {
            var n = this.Nu.exec(t), r = Number(n[1]);
            return uu.Iu(r, e);
        }, 
        /**
         * Parses an online state from WebStorage. Returns 'null' if the value
         * could not be parsed.
         */
        t.prototype.Mu = function(t) {
            return au.Iu(t);
        }, t.prototype.ah = function(t) {
            return __awaiter(this, void 0, void 0, (function() {
                return __generator(this, (function(e) {
                    return t.user.uid === this.currentUser.uid ? [ 2 /*return*/ , this.gu._h(t.batchId, t.state, t.error) ] : (T$1("SharedClientState", "Ignoring mutation for non-active user " + t.user.uid), 
                    [ 2 /*return*/ ]);
                }));
            }));
        }, t.prototype.hh = function(t) {
            return this.gu.fh(t.targetId, t.state, t.error);
        }, t.prototype.ih = function(t, e) {
            var n = this, r = e ? this.pu.rt(t, e) : this.pu.remove(t), i = this.Lu(this.pu), o = this.Lu(r), u = [], s = [];
            return o.forEach((function(t) {
                i.has(t) || u.push(t);
            })), i.forEach((function(t) {
                o.has(t) || s.push(t);
            })), this.gu.dh(u, s).then((function() {
                n.pu = r;
            }));
        }, t.prototype.ku = function(t) {
            // We check whether the client that wrote this online state is still active
            // by comparing its client ID to the list of clients kept active in
            // IndexedDb. If a client does not update their IndexedDb client state
            // within 5 seconds, it is considered inactive and we don't emit an online
            // state event.
            this.pu.get(t.clientId) && this.Oc(t.onlineState);
        }, t.prototype.Lu = function(t) {
            var e = Tt();
            return t.forEach((function(t, n) {
                e = e.Ot(n.activeTargetIds);
            })), e;
        }, t;
    }(), fu = /** @class */ function() {
        function t() {
            this.wh = new cu, this.Th = {}, this.Oc = null, this.Xi = null;
        }
        return t.prototype.qu = function(t) {
            // No op.
        }, t.prototype.Qu = function(t, e, n) {
            // No op.
        }, t.prototype.Wu = function(t) {
            return this.wh.Au(t), this.Th[t] || "not-current";
        }, t.prototype.Ju = function(t, e, n) {
            this.Th[t] = e;
        }, t.prototype.Gu = function(t) {
            this.wh.Ru(t);
        }, t.prototype.zu = function(t) {
            return this.wh.activeTargetIds.has(t);
        }, t.prototype.Hu = function(t) {
            delete this.Th[t];
        }, t.prototype.$u = function() {
            return this.wh.activeTargetIds;
        }, t.prototype.Bu = function(t) {
            return this.wh.activeTargetIds.has(t);
        }, t.prototype.start = function() {
            return this.wh = new cu, Promise.resolve();
        }, t.prototype.Xu = function(t, e, n) {
            // No op.
        }, t.prototype.Zu = function(t) {
            // No op.
        }, t.prototype.pa = function() {}, t.prototype.er = function(t) {}, t.prototype.eh = function() {
            // No op.
        }, t;
    }(), lu = function(t) {
        this.key = t;
    }, pu = function(t) {
        this.key = t;
    }, du = /** @class */ function() {
        function t(t, 
        /** Documents included in the remote target */
        e) {
            this.query = t, this.Eh = e, this.Ih = null, 
            /**
                 * A flag whether the view is current with the backend. A view is considered
                 * current after it has seen the current flag from the backend and did not
                 * lose consistency within the watch stream (e.g. because of an existence
                 * filter mismatch).
                 */
            this.Zt = !1, 
            /** Documents in the view but not in the remote target */
            this.mh = It(), 
            /** Document Keys that have local changes */
            this.Qt = It(), this.Ah = Fn(t), this.Rh = new Nt(this.Ah);
        }
        return Object.defineProperty(t.prototype, "Ph", {
            /**
             * The set of remote documents that the server has told us belongs to the target associated with
             * this view.
             */
            get: function() {
                return this.Eh;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Iterates over a set of doc changes, applies the query limit, and computes
         * what the new results should be, what the changes were, and whether we may
         * need to go back to the local cache for more results. Does not make any
         * changes to the view.
         * @param docChanges The doc changes to apply to this view.
         * @param previousChanges If this is being called with a refill, then start
         *        with this set of docs and changes instead of the current view.
         * @return a new set of docs, changes, and refill flag.
         */
        t.prototype.gh = function(t, e) {
            var n = this, r = e ? e.Vh : new xt, i = e ? e.Rh : this.Rh, o = e ? e.Qt : this.Qt, u = i, s = !1, a = xn(this.query) && i.size === this.query.limit ? i.last() : null, c = An(this.query) && i.size === this.query.limit ? i.first() : null;
            // Drop documents out to meet limit/limitToLast requirement.
            if (t.ut((function(t, e) {
                var h = i.get(t), f = e instanceof bn ? e : null;
                f && (f = qn(n.query, f) ? f : null);
                var l = !!h && n.Qt.has(h.key), p = !!f && (f.Je || 
                // We only consider committed mutations for documents that were
                // mutated during the lifetime of the view.
                n.Qt.has(f.key) && f.hasCommittedMutations), d = !1;
                // Calculate change
                h && f ? h.data().isEqual(f.data()) ? l !== p && (r.track({
                    type: 3 /* Metadata */ ,
                    doc: f
                }), d = !0) : n.yh(h, f) || (r.track({
                    type: 2 /* Modified */ ,
                    doc: f
                }), d = !0, (a && n.Ah(f, a) > 0 || c && n.Ah(f, c) < 0) && (
                // This doc moved from inside the limit to outside the limit.
                // That means there may be some other doc in the local cache
                // that should be included instead.
                s = !0)) : !h && f ? (r.track({
                    type: 0 /* Added */ ,
                    doc: f
                }), d = !0) : h && !f && (r.track({
                    type: 1 /* Removed */ ,
                    doc: h
                }), d = !0, (a || c) && (
                // A doc was removed from a full limit query. We'll need to
                // requery from the local cache to see if we know about some other
                // doc that should be in the results.
                s = !0)), d && (f ? (u = u.add(f), o = p ? o.add(t) : o.delete(t)) : (u = u.delete(t), 
                o = o.delete(t)));
            })), xn(this.query) || An(this.query)) for (;u.size > this.query.limit; ) {
                var h = xn(this.query) ? u.last() : u.first();
                u = u.delete(h.key), o = o.delete(h.key), r.track({
                    type: 1 /* Removed */ ,
                    doc: h
                });
            }
            return {
                Rh: u,
                Vh: r,
                ph: s,
                Qt: o
            };
        }, t.prototype.yh = function(t, e) {
            // We suppress the initial change event for documents that were modified as
            // part of a write acknowledgment (e.g. when the value of a server transform
            // is applied) as Watch will send us the same document again.
            // By suppressing the event, we only raise two user visible events (one with
            // `hasPendingWrites` and the final state of the document) instead of three
            // (one with `hasPendingWrites`, the modified document with
            // `hasPendingWrites` and the final state of the document).
            return t.Je && e.hasCommittedMutations && !e.Je;
        }, 
        /**
         * Updates the view with the given ViewDocumentChanges and optionally updates
         * limbo docs and sync state from the provided target change.
         * @param docChanges The set of changes to make to the view's docs.
         * @param updateLimboDocuments Whether to update limbo documents based on this
         *        change.
         * @param targetChange A target change to apply for computing limbo docs and
         *        sync state.
         * @return A new ViewChange with the given docs, changes, and sync state.
         */
        // PORTING NOTE: The iOS/Android clients always compute limbo document changes.
        t.prototype.bi = function(t, e, n) {
            var r = this, i = this.Rh;
            this.Rh = t.Rh, this.Qt = t.Qt;
            // Sort changes based on type and query comparator
            var o = t.Vh.qt();
            o.sort((function(t, e) {
                return function(t, e) {
                    var n = function(t) {
                        switch (t) {
                          case 0 /* Added */ :
                            return 1;

                          case 2 /* Modified */ :
                          case 3 /* Metadata */ :
                            // A metadata change is converted to a modified change at the public
                            // api layer.  Since we sort by document key and then change type,
                            // metadata and modified changes must be sorted equivalently.
                            return 2;

                          case 1 /* Removed */ :
                            return 0;

                          default:
                            return S$1();
                        }
                    };
                    return n(t) - n(e);
                }(t.type, e.type) || r.Ah(t.doc, e.doc);
            })), this.bh(n);
            var u = e ? this.Sh() : [], s = 0 === this.mh.size && this.Zt ? 1 /* Synced */ : 0 /* Local */ , a = s !== this.Ih;
            return this.Ih = s, 0 !== o.length || a ? {
                snapshot: new At(this.query, t.Rh, i, o, t.Qt, 0 /* Local */ === s, a, 
                /* excludesMetadataChanges= */ !1),
                Dh: u
            } : {
                Dh: u
            };
            // no changes
            }, 
        /**
         * Applies an OnlineState change to the view, potentially generating a
         * ViewChange if the view's syncState changes as a result.
         */
        t.prototype.Bs = function(t) {
            return this.Zt && "Offline" /* Offline */ === t ? (
            // If we're offline, set `current` to false and then call applyChanges()
            // to refresh our syncState and generate a ViewChange as appropriate. We
            // are guaranteed to get a new TargetChange that sets `current` back to
            // true once the client is back online.
            this.Zt = !1, this.bi({
                Rh: this.Rh,
                Vh: new xt,
                Qt: this.Qt,
                ph: !1
            }, 
            /* updateLimboDocuments= */ !1)) : {
                Dh: []
            };
        }, 
        /**
         * Returns whether the doc for the given key should be in limbo.
         */
        t.prototype.Ch = function(t) {
            // If the remote end says it's part of this query, it's not in limbo.
            return !this.Eh.has(t) && 
            // The local store doesn't think it's a result, so it shouldn't be in limbo.
            !!this.Rh.has(t) && !this.Rh.get(t).Je;
        }, 
        /**
         * Updates syncedDocuments, current, and limbo docs based on the given change.
         * Returns the list of changes to which docs are in limbo.
         */
        t.prototype.bh = function(t) {
            var e = this;
            t && (t.te.forEach((function(t) {
                return e.Eh = e.Eh.add(t);
            })), t.ee.forEach((function(t) {})), t.ne.forEach((function(t) {
                return e.Eh = e.Eh.delete(t);
            })), this.Zt = t.Zt);
        }, t.prototype.Sh = function() {
            var t = this;
            // We can only determine limbo documents when we're in-sync with the server.
                    if (!this.Zt) return [];
            // TODO(klimt): Do this incrementally so that it's not quadratic when
            // updating many documents.
                    var e = this.mh;
            this.mh = It(), this.Rh.forEach((function(e) {
                t.Ch(e.key) && (t.mh = t.mh.add(e.key));
            }));
            // Diff the new limbo docs with the old limbo docs.
            var n = [];
            return e.forEach((function(e) {
                t.mh.has(e) || n.push(new pu(e));
            })), this.mh.forEach((function(t) {
                e.has(t) || n.push(new lu(t));
            })), n;
        }, 
        /**
         * Update the in-memory state of the current view with the state read from
         * persistence.
         *
         * We update the query view whenever a client's primary status changes:
         * - When a client transitions from primary to secondary, it can miss
         *   LocalStorage updates and its query views may temporarily not be
         *   synchronized with the state on disk.
         * - For secondary to primary transitions, the client needs to update the list
         *   of `syncedDocuments` since secondary clients update their query views
         *   based purely on synthesized RemoteEvents.
         *
         * @param queryResult.documents - The documents that match the query according
         * to the LocalStore.
         * @param queryResult.remoteKeys - The keys of the documents that match the
         * query according to the backend.
         *
         * @return The ViewChange that resulted from this synchronization.
         */
        // PORTING NOTE: Multi-tab only.
        t.prototype.Nh = function(t) {
            this.Eh = t.Xa, this.mh = It();
            var e = this.gh(t.documents);
            return this.bi(e, /*updateLimboDocuments=*/ !0);
        }, 
        /**
         * Returns a view snapshot as if this query was just listened to. Contains
         * a document add for every existing document and the `fromCache` and
         * `hasPendingWrites` status of the already established view.
         */
        // PORTING NOTE: Multi-tab only.
        t.prototype.xh = function() {
            return At.jt(this.query, this.Rh, this.Qt, 0 /* Local */ === this.Ih);
        }, t;
    }(), vu = function(
    /**
         * The query itself.
         */
    t, 
    /**
         * The target number created by the client that is used in the watch
         * stream to identify this query.
         */
    e, 
    /**
         * The view is responsible for computing the final merged truth of what
         * docs are in the query. It gets notified of local and remote changes,
         * and applies the query filters and limits to determine the most correct
         * possible results.
         */
    n) {
        this.query = t, this.targetId = e, this.view = n;
    }, yu = function(t) {
        this.key = t, 
        /**
                 * Set to true once we've received a document. This is used in
                 * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
                 * decide whether it needs to manufacture a delete event for the target once
                 * the target is CURRENT.
                 */
        this.Fh = !1;
    }, gu = /** @class */ function() {
        function t(t, e, n, 
        // PORTING NOTE: Manages state synchronization in multi-tab environments.
        r, i, o) {
            this.Kc = t, this.Oh = e, this.Mh = n, this.kh = r, this.currentUser = i, this.$h = o, 
            this.Lh = {}, this.Bh = new q$1((function(t) {
                return Mn(t);
            }), Rn), this.qh = new Map, 
            /**
                 * The keys of documents that are in limbo for which we haven't yet started a
                 * limbo resolution query.
                 */
            this.Uh = [], 
            /**
                 * Keeps track of the target ID for each document that is in limbo with an
                 * active target.
                 */
            this.Qh = new ht(Y$1.V), 
            /**
                 * Keeps track of the information about an active limbo resolution for each
                 * active target ID that was started for the purpose of limbo resolution.
                 */
            this.Kh = new Map, this.Wh = new tu, 
            /** Stores user completion handlers, indexed by User and BatchId. */
            this.jh = {}, 
            /** Stores user callbacks waiting for all pending writes to be acknowledged. */
            this.Gh = new Map, this.zh = Hi.vo(), this.onlineState = "Unknown" /* Unknown */ , 
            // The primary state is set to `true` or `false` immediately after Firestore
            // startup. In the interim, a client should only be considered primary if
            // `isPrimary` is true.
            this.Hh = void 0;
        }
        return Object.defineProperty(t.prototype, "Jh", {
            get: function() {
                return !0 === this.Hh;
            },
            enumerable: !1,
            configurable: !0
        }), t;
    }();

    /**
     * Holds the state of a query target, including its target ID and whether the
     * target is 'not-current', 'current' or 'rejected'.
     */
    // Visible for testing
    /**
     * Initiates the new listen, resolves promise when listen enqueued to the
     * server. All the subsequent view snapshots or errors are sent to the
     * subscribed handlers. Returns the initial snapshot.
     */
    function mu(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o, u, s, a;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return e = Wu(t), (u = e.Bh.get(r)) ? (
                    // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
                    // already exists when EventManager calls us for the first time. This
                    // happens when the primary tab is already listening to this query on
                    // behalf of another tab and the user of the primary also starts listening
                    // to the query. EventManager will not have an assigned target ID in this
                    // case and calls `listen` to obtain this ID.
                    i = u.targetId, e.kh.Wu(i), o = u.view.xh(), [ 3 /*break*/ , 4 ]) : [ 3 /*break*/ , 1 ];

                  case 1:
                    return [ 4 /*yield*/ , yo(e.Kc, Pn(r)) ];

                  case 2:
                    return s = n.sent(), a = e.kh.Wu(s.targetId), i = s.targetId, [ 4 /*yield*/ , wu(e, r, i, "current" === a) ];

                  case 3:
                    o = n.sent(), e.Jh && Oo(e.Oh, s), n.label = 4;

                  case 4:
                    return [ 2 /*return*/ , o ];
                }
            }));
        }));
    }

    /**
     * Registers a view for a previously unknown query and computes its initial
     * snapshot.
     */ function wu(t, r, i, o) {
        return __awaiter(this, void 0, void 0, (function() {
            var u, s, a, c, h, f;
            return __generator(this, (function(l) {
                switch (l.label) {
                  case 0:
                    // PORTING NOTE: On Web only, we inject the code that registers new Limbo
                    // targets based on view changes. This allows us to only depend on Limbo
                    // changes when user code includes queries.
                    return t.Yh = function(r, i, o) {
                        return function(t, r, i, o) {
                            return __awaiter(this, void 0, void 0, (function() {
                                var e, u, s;
                                return __generator(this, (function(n) {
                                    switch (n.label) {
                                      case 0:
                                        return e = r.view.gh(i), e.ph ? [ 4 /*yield*/ , mo(t.Kc, r.query, 
                                        /* usePreviousResults= */ !1).then((function(t) {
                                            var n = t.documents;
                                            return r.view.gh(n, e);
                                        })) ] : [ 3 /*break*/ , 2 ];

                                      case 1:
                                        // The query has a limit and some docs were removed, so we need
                                        // to re-run the query against the local store to make sure we
                                        // didn't lose any good docs that had been past the limit.
                                        e = n.sent(), n.label = 2;

                                      case 2:
                                        return u = o && o.Gt.get(r.targetId), s = r.view.bi(e, 
                                        /* updateLimboDocuments= */ t.Jh, u), [ 2 /*return*/ , (Pu(t, r.targetId, s.Dh), 
                                        s.snapshot) ];
                                    }
                                }));
                            }));
                        }(t, r, i, o);
                    }, [ 4 /*yield*/ , mo(t.Kc, r, 
                    /* usePreviousResults= */ !0) ];

                  case 1:
                    return u = l.sent(), s = new du(r, u.Xa), a = s.gh(u.documents), c = kt.Xt(i, o && "Offline" /* Offline */ !== t.onlineState), 
                    h = s.bi(a, 
                    /* updateLimboDocuments= */ t.Jh, c), Pu(t, i, h.Dh), f = new vu(r, i, s), [ 2 /*return*/ , (t.Bh.set(r, f), 
                    t.qh.has(i) ? t.qh.get(i).push(r) : t.qh.set(i, [ r ]), h.snapshot) ];
                }
            }));
        }));
    }

    /** Stops listening to the query. */ function bu(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return e = D$1(t), i = e.Bh.get(r), (o = e.qh.get(i.targetId)).length > 1 ? [ 2 /*return*/ , (e.qh.set(i.targetId, o.filter((function(t) {
                        return !Rn(t, r);
                    }))), void e.Bh.delete(r)) ] : e.Jh ? (
                    // We need to remove the local query target first to allow us to verify
                    // whether any other client is still interested in this target.
                    e.kh.Gu(i.targetId), e.kh.Bu(i.targetId) ? [ 3 /*break*/ , 2 ] : [ 4 /*yield*/ , go(e.Kc, i.targetId, 
                    /*keepPersistedTargetData=*/ !1).then((function() {
                        e.kh.Hu(i.targetId), Po(e.Oh, i.targetId), Du(e, i.targetId);
                    })).catch(Io) ]) : [ 3 /*break*/ , 3 ];

                  case 1:
                    n.sent(), n.label = 2;

                  case 2:
                    return [ 3 /*break*/ , 5 ];

                  case 3:
                    return Du(e, i.targetId), [ 4 /*yield*/ , go(e.Kc, i.targetId, 
                    /*keepPersistedTargetData=*/ !0) ];

                  case 4:
                    n.sent(), n.label = 5;

                  case 5:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Initiates the write of local mutation batch which involves adding the
     * writes to the mutation queue, notifying the remote store about new
     * mutations and raising events for any changes this write caused.
     *
     * The promise returned by this call is resolved when the above steps
     * have completed, *not* when the write was acked by the backend. The
     * userCallback is resolved once the write was acked/rejected by the
     * backend (or failed locally for any other reason).
     */ function _u(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, o, u, s;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    e = Yu(t), n.label = 1;

                  case 1:
                    return n.trys.push([ 1, 5, , 6 ]), [ 4 /*yield*/ , function(t, e) {
                        var n, r = D$1(t), i = B.now(), o = e.reduce((function(t, e) {
                            return t.add(e.key);
                        }), It());
                        return r.persistence.runTransaction("Locally write mutations", "readwrite", (function(t) {
                            return r.Ga.Li(t, o).next((function(o) {
                                n = o;
                                for (
                                // For non-idempotent mutations (such as `FieldValue.increment()`),
                                // we record the base state in a separate patch mutation. This is
                                // later used to guarantee consistent values and prevents flicker
                                // even if the backend sends us an update that already includes our
                                // transform.
                                var u = [], s = 0, a = e; s < a.length; s++) {
                                    var c = a[s], h = on(c, n.get(c.key));
                                    null != h && 
                                    // NOTE: The base state should only be applied if there's some
                                    // existing document to override, so use a Precondition of
                                    // exists=true
                                    u.push(new cn(c.key, h, mn(h.proto.mapValue), Ze.exists(!0)));
                                }
                                return r.xi.Qr(t, i, u, e);
                            }));
                        })).then((function(t) {
                            var e = t.wi(n);
                            return {
                                batchId: t.batchId,
                                Ii: e
                            };
                        }));
                    }(e.Kc, r) ];

                  case 2:
                    return o = n.sent(), e.kh.qu(o.batchId), function(t, e, n) {
                        var r = t.jh[t.currentUser.Ys()];
                        r || (r = new ht(V$1)), r = r.rt(e, n), t.jh[t.currentUser.Ys()] = r;
                    }(e, o.batchId, i), [ 4 /*yield*/ , Lu(e, o.Ii) ];

                  case 3:
                    return n.sent(), [ 4 /*yield*/ , Go(e.Oh) ];

                  case 4:
                    return n.sent(), [ 3 /*break*/ , 6 ];

                  case 5:
                    return u = n.sent(), s = wr(u, "Failed to persist write"), i.reject(s), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Applies one remote event to the sync engine, notifying any views of the
     * changes, and releasing any pending mutation batches that would become
     * visible because of the snapshot version the remote event contains.
     */ function Iu(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    e = D$1(t), n.label = 1;

                  case 1:
                    return n.trys.push([ 1, 4, , 6 ]), [ 4 /*yield*/ , po(e.Kc, r) ];

                  case 2:
                    return i = n.sent(), 
                    // Update `receivedDocument` as appropriate for any limbo targets.
                    r.Gt.forEach((function(t, n) {
                        var r = e.Kh.get(n);
                        r && (
                        // Since this is a limbo resolution lookup, it's for a single document
                        // and it could be added, modified, or removed, but not a combination.
                        k$1(t.te.size + t.ee.size + t.ne.size <= 1), t.te.size > 0 ? r.Fh = !0 : t.ee.size > 0 ? k$1(r.Fh) : t.ne.size > 0 && (k$1(r.Fh), 
                        r.Fh = !1));
                    })), [ 4 /*yield*/ , Lu(e, i, r) ];

                  case 3:
                    // Update `receivedDocument` as appropriate for any limbo targets.
                    return n.sent(), [ 3 /*break*/ , 6 ];

                  case 4:
                    return [ 4 /*yield*/ , Io(n.sent()) ];

                  case 5:
                    return n.sent(), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Applies an OnlineState change to the sync engine and notifies any views of
     * the change.
     */ function Eu(t, e, n) {
        var r = D$1(t);
        // If we are the secondary client, we explicitly ignore the remote store's
        // online state (the local client may go offline, even though the primary
        // tab remains online) and only apply the primary tab's online state from
        // SharedClientState.
            if (r.Jh && 0 /* RemoteStore */ === n || !r.Jh && 1 /* SharedClientState */ === n) {
            var i = [];
            r.Bh.forEach((function(t, n) {
                var r = n.view.Bs(e);
                r.snapshot && i.push(r.snapshot);
            })), function(t, e) {
                var n = D$1(t);
                n.onlineState = e;
                var r = !1;
                n.queries.forEach((function(t, n) {
                    for (var i = 0, o = n.listeners; i < o.length; i++) {
                        // Run global snapshot listeners if a consistent snapshot has been emitted.
                        o[i].Bs(e) && (r = !0);
                    }
                })), r && xr(n);
            }(r.Mh, e), i.length && r.Lh.Rc(i), r.onlineState = e, r.Jh && r.kh.Zu(e);
        }
    }

    /**
     * Rejects the listen for the given targetID. This can be triggered by the
     * backend for any active target.
     *
     * @param syncEngine The sync engine implementation.
     * @param targetId The targetID corresponds to one previously initiated by the
     * user as part of TargetData passed to listen() on RemoteStore.
     * @param err A description of the condition that has forced the rejection.
     * Nearly always this will be an indication that the user is no longer
     * authorized to see the data matching the target.
     */ function Tu(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, o, u, s, a, c;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    // PORTING NOTE: Multi-tab only.
                    return (e = D$1(t)).kh.Ju(r, "rejected", i), o = e.Kh.get(r), (u = o && o.key) ? (s = (s = new ht(Y$1.V)).rt(u, new _n(u, z.min())), 
                    a = It().add(u), c = new St(z.min(), 
                    /* targetChanges= */ new Map, 
                    /* targetMismatches= */ new pt(V$1), s, a), [ 4 /*yield*/ , Iu(e, c) ]) : [ 3 /*break*/ , 2 ];

                  case 1:
                    return n.sent(), 
                    // Since this query failed, we won't want to manually unlisten to it.
                    // We only remove it from bookkeeping after we successfully applied the
                    // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
                    // this query when the RemoteStore restarts the Watch stream, which should
                    // re-trigger the target failure.
                    e.Qh = e.Qh.remove(u), e.Kh.delete(r), Cu(e), [ 3 /*break*/ , 4 ];

                  case 2:
                    return [ 4 /*yield*/ , go(e.Kc, r, 
                    /* keepPersistedTargetData */ !1).then((function() {
                        return Du(e, r, i);
                    })).catch(Io) ];

                  case 3:
                    n.sent(), n.label = 4;

                  case 4:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function Nu(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    e = D$1(t), i = r.batch.batchId, n.label = 1;

                  case 1:
                    return n.trys.push([ 1, 4, , 6 ]), [ 4 /*yield*/ , fo(e.Kc, r) ];

                  case 2:
                    return o = n.sent(), 
                    // The local store may or may not be able to apply the write result and
                    // raise events immediately (depending on whether the watcher is caught
                    // up), so we raise user callbacks first so that they consistently happen
                    // before listen events.
                    ku(e, i, /*error=*/ null), Su(e, i), e.kh.Qu(i, "acknowledged"), [ 4 /*yield*/ , Lu(e, o) ];

                  case 3:
                    // The local store may or may not be able to apply the write result and
                    // raise events immediately (depending on whether the watcher is caught
                    // up), so we raise user callbacks first so that they consistently happen
                    // before listen events.
                    return n.sent(), [ 3 /*break*/ , 6 ];

                  case 4:
                    return [ 4 /*yield*/ , Io(n.sent()) ];

                  case 5:
                    return n.sent(), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function xu(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, o;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    e = D$1(t), n.label = 1;

                  case 1:
                    return n.trys.push([ 1, 4, , 6 ]), [ 4 /*yield*/ , function(t, e) {
                        var n = D$1(t);
                        return n.persistence.runTransaction("Reject batch", "readwrite-primary", (function(t) {
                            var r;
                            return n.xi.Wr(t, e).next((function(e) {
                                return k$1(null !== e), r = e.keys(), n.xi.Yr(t, e);
                            })).next((function() {
                                return n.xi.no(t);
                            })).next((function() {
                                return n.Ga.Li(t, r);
                            }));
                        }));
                    }(e.Kc, r) ];

                  case 2:
                    return o = n.sent(), 
                    // The local store may or may not be able to apply the write result and
                    // raise events immediately (depending on whether the watcher is caught up),
                    // so we raise user callbacks first so that they consistently happen before
                    // listen events.
                    ku(e, r, i), Su(e, r), e.kh.Qu(r, "rejected", i), [ 4 /*yield*/ , Lu(e, o) ];

                  case 3:
                    // The local store may or may not be able to apply the write result and
                    // raise events immediately (depending on whether the watcher is caught up),
                    // so we raise user callbacks first so that they consistently happen before
                    // listen events.
                    return n.sent(), [ 3 /*break*/ , 6 ];

                  case 4:
                    return [ 4 /*yield*/ , Io(n.sent()) ];

                  case 5:
                    return n.sent(), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Registers a user callback that resolves when all pending mutations at the moment of calling
     * are acknowledged .
     */ function Au(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o, u, s;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    Mo((e = D$1(t)).Oh) || T$1("SyncEngine", "The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled."), 
                    n.label = 1;

                  case 1:
                    return n.trys.push([ 1, 3, , 4 ]), [ 4 /*yield*/ , function(t) {
                        var e = D$1(t);
                        return e.persistence.runTransaction("Get highest unacknowledged batch id", "readonly", (function(t) {
                            return e.xi.zr(t);
                        }));
                    }(e.Kc) ];

                  case 2:
                    return -1 === (i = n.sent()) ? [ 2 /*return*/ , void r.resolve() ] : ((o = e.Gh.get(i) || []).push(r), 
                    e.Gh.set(i, o), [ 3 /*break*/ , 4 ]);

                  case 3:
                    return u = n.sent(), s = wr(u, "Initialization of waitForPendingWrites() operation failed"), 
                    r.reject(s), [ 3 /*break*/ , 4 ];

                  case 4:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
     * if there are any.
     */ function Su(t, e) {
        (t.Gh.get(e) || []).forEach((function(t) {
            t.resolve();
        })), t.Gh.delete(e)
        /** Reject all outstanding callbacks waiting for pending writes to complete. */;
    }

    function ku(t, e, n) {
        var r = D$1(t), i = r.jh[r.currentUser.Ys()];
        // NOTE: Mutations restored from persistence won't have callbacks, so it's
        // okay for there to be no callback for this ID.
        if (i) {
            var o = i.get(e);
            o && (n ? o.reject(n) : o.resolve(), i = i.remove(e)), r.jh[r.currentUser.Ys()] = i;
        }
    }

    function Du(t, e, n) {
        void 0 === n && (n = null), t.kh.Gu(e);
        for (var r = 0, i = t.qh.get(e); r < i.length; r++) {
            var o = i[r];
            t.Bh.delete(o), n && t.Lh.Xh(o, n);
        }
        t.qh.delete(e), t.Jh && t.Wh.du(e).forEach((function(e) {
            t.Wh.so(e) || 
            // We removed the last reference for this key
            Ou(t, e);
        }));
    }

    function Ou(t, e) {
        // It's possible that the target already got removed because the query failed. In that case,
        // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
        var n = t.Qh.get(e);
        null !== n && (Po(t.Oh, n), t.Qh = t.Qh.remove(e), t.Kh.delete(n), Cu(t));
    }

    function Pu(t, e, n) {
        for (var r = 0, i = n; r < i.length; r++) {
            var o = i[r];
            o instanceof lu ? (t.Wh.Qo(o.key, e), Vu(t, o)) : o instanceof pu ? (T$1("SyncEngine", "Document no longer in limbo: " + o.key), 
            t.Wh.Wo(o.key, e), t.Wh.so(o.key) || 
            // We removed the last reference for this key
            Ou(t, o.key)) : S$1();
        }
    }

    function Vu(t, e) {
        var n = e.key;
        t.Qh.get(n) || (T$1("SyncEngine", "New document in limbo: " + n), t.Uh.push(n), Cu(t));
    }

    /**
     * Starts listens for documents in limbo that are enqueued for resolution,
     * subject to a maximum number of concurrent resolutions.
     *
     * Without bounding the number of concurrent resolutions, the server can fail
     * with "resource exhausted" errors which can lead to pathological client
     * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
     */ function Cu(t) {
        for (;t.Uh.length > 0 && t.Qh.size < t.$h; ) {
            var e = t.Uh.shift(), n = t.zh.next();
            t.Kh.set(n, new yu(e)), t.Qh = t.Qh.rt(e, n), Oo(t.Oh, new ut(Pn(Nn(e.path)), n, 2 /* LimboResolution */ , zr.nr));
        }
    }

    function Lu(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var o, u, s, a;
            return __generator(this, (function(c) {
                switch (c.label) {
                  case 0:
                    return o = D$1(t), u = [], s = [], a = [], o.Bh.T() ? [ 3 /*break*/ , 3 ] : (o.Bh.forEach((function(t, e) {
                        a.push(o.Yh(e, r, i).then((function(t) {
                            if (t) {
                                o.Jh && o.kh.Ju(e.targetId, t.fromCache ? "not-current" : "current"), u.push(t);
                                var n = Br.Yi(e.targetId, t);
                                s.push(n);
                            }
                        })));
                    })), [ 4 /*yield*/ , Promise.all(a) ]);

                  case 1:
                    return c.sent(), o.Lh.Rc(u), [ 4 /*yield*/ , function(t, r) {
                        return __awaiter(this, void 0, void 0, (function() {
                            var e, i, o, u, s, a, c, h, f;
                            return __generator(this, (function(n) {
                                switch (n.label) {
                                  case 0:
                                    e = D$1(t), n.label = 1;

                                  case 1:
                                    return n.trys.push([ 1, 3, , 4 ]), [ 4 /*yield*/ , e.persistence.runTransaction("notifyLocalViewChanges", "readwrite", (function(t) {
                                        return or.forEach(r, (function(n) {
                                            return or.forEach(n.Hi, (function(r) {
                                                return e.persistence.Lr.Qo(t, n.targetId, r);
                                            })).next((function() {
                                                return or.forEach(n.Ji, (function(r) {
                                                    return e.persistence.Lr.Wo(t, n.targetId, r);
                                                }));
                                            }));
                                        }));
                                    })) ];

                                  case 2:
                                    return n.sent(), [ 3 /*break*/ , 4 ];

                                  case 3:
                                    if (!cr(i = n.sent())) throw i;
                                    // If `notifyLocalViewChanges` fails, we did not advance the sequence
                                    // number for the documents that were included in this transaction.
                                    // This might trigger them to be deleted earlier than they otherwise
                                    // would have, but it should not invalidate the integrity of the data.
                                                                    return T$1("LocalStore", "Failed to update sequence numbers: " + i), 
                                    [ 3 /*break*/ , 4 ];

                                  case 4:
                                    for (o = 0, u = r; o < u.length; o++) s = u[o], a = s.targetId, s.fromCache || (c = e.Qa.get(a), 
                                    h = c.et, f = c.it(h), 
                                    // Advance the last limbo free snapshot version
                                    e.Qa = e.Qa.rt(a, f));
                                    return [ 2 /*return*/ ];
                                }
                            }));
                        }));
                    }(o.Kc, s) ];

                  case 2:
                    c.sent(), c.label = 3;

                  case 3:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function Ru(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return (e = D$1(t)).currentUser.isEqual(r) ? [ 3 /*break*/ , 3 ] : (T$1("SyncEngine", "User change. New user:", r.Ys()), 
                    [ 4 /*yield*/ , ho(e.Kc, r) ]);

                  case 1:
                    return i = n.sent(), e.currentUser = r, 
                    // Fails tasks waiting for pending writes requested by previous user.
                    function(t, e) {
                        t.Gh.forEach((function(t) {
                            t.forEach((function(t) {
                                t.reject(new j(F$1.CANCELLED, "'waitForPendingWrites' promise is rejected due to a user change."));
                            }));
                        })), t.Gh.clear();
                    }(e), 
                    // TODO(b/114226417): Consider calling this only in the primary tab.
                    e.kh.Xu(r, i.Ja, i.Ya), [ 4 /*yield*/ , Lu(e, i.Ha) ];

                  case 2:
                    n.sent(), n.label = 3;

                  case 3:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function Mu(t, e) {
        var n = D$1(t), r = n.Kh.get(e);
        if (r && r.Fh) return It().add(r.key);
        var i = It(), o = n.qh.get(e);
        if (!o) return i;
        for (var u = 0, s = o; u < s.length; u++) {
            var a = s[u], c = n.Bh.get(a);
            i = i.Ot(c.view.Ph);
        }
        return i;
    }

    /**
     * Reconcile the list of synced documents in an existing view with those
     * from persistence.
     */ function Uu(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return [ 4 /*yield*/ , mo((e = D$1(t)).Kc, r.query, 
                    /* usePreviousResults= */ !0) ];

                  case 1:
                    return i = n.sent(), o = r.view.Nh(i), [ 2 /*return*/ , (e.Jh && Pu(e, r.targetId, o.Dh), 
                    o) ];
                }
            }));
        }));
    }

    /**
     * Retrieves newly changed documents from remote document cache and raises
     * snapshots if needed.
     */
    // PORTING NOTE: Multi-Tab only.
    function qu(t) {
        return __awaiter(this, void 0, void 0, (function() {
            var e;
            return __generator(this, (function(n) {
                return [ 2 /*return*/ , bo((e = D$1(t)).Kc).then((function(t) {
                    return Lu(e, t);
                })) ];
            }));
        }));
    }

    /** Applies a mutation state to an existing batch.  */
    // PORTING NOTE: Multi-Tab only.
    function Fu(t, r, i, o) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, u;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return [ 4 /*yield*/ , function(t, e) {
                        var n = D$1(t), r = D$1(n.xi);
                        return n.persistence.runTransaction("Lookup mutation documents", "readonly", (function(t) {
                            return r.jr(t, e).next((function(e) {
                                return e ? n.Ga.Li(t, e) : or.resolve(null);
                            }));
                        }));
                    }((e = D$1(t)).Kc, r) ];

                  case 1:
                    return null === (u = n.sent()) ? [ 3 /*break*/ , 6 ] : "pending" !== i ? [ 3 /*break*/ , 3 ] : [ 4 /*yield*/ , Go(e.Oh) ];

                  case 2:
                    // If we are the primary client, we need to send this write to the
                    // backend. Secondary clients will ignore these writes since their remote
                    // connection is disabled.
                    return n.sent(), [ 3 /*break*/ , 4 ];

                  case 3:
                    "acknowledged" === i || "rejected" === i ? (
                    // NOTE: Both these methods are no-ops for batches that originated from
                    // other clients.
                    ku(e, r, o || null), Su(e, r), function(t, e) {
                        D$1(D$1(t).xi).Zr(e);
                    }(e.Kc, r)) : S$1(), n.label = 4;

                  case 4:
                    return [ 4 /*yield*/ , Lu(e, u) ];

                  case 5:
                    return n.sent(), [ 3 /*break*/ , 7 ];

                  case 6:
                    // A throttled tab may not have seen the mutation before it was completed
                    // and removed from the mutation queue, in which case we won't have cached
                    // the affected documents. In this case we can safely ignore the update
                    // since that means we didn't apply the mutation locally at all (if we
                    // had, we would have cached the affected documents), and so we will just
                    // see any resulting document changes via normal remote document updates
                    // as applicable.
                    T$1("SyncEngine", "Cannot apply mutation batch with id: " + r), n.label = 7;

                  case 7:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /** Applies a query target change from a different tab. */
    // PORTING NOTE: Multi-Tab only.
    function ju(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o, u, s, a, c, h;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return Wu(e = D$1(t)), Yu(e), !0 !== r || !0 === e.Hh ? [ 3 /*break*/ , 3 ] : (i = e.kh.$u(), 
                    [ 4 /*yield*/ , Bu(e, i.O()) ]);

                  case 1:
                    return o = n.sent(), e.Hh = !0, [ 4 /*yield*/ , Xo(e.Oh, !0) ];

                  case 2:
                    for (n.sent(), u = 0, s = o; u < s.length; u++) a = s[u], Oo(e.Oh, a);
                    return [ 3 /*break*/ , 7 ];

                  case 3:
                    return !1 !== r || !1 === e.Hh ? [ 3 /*break*/ , 7 ] : (c = [], h = Promise.resolve(), 
                    e.qh.forEach((function(t, n) {
                        e.kh.zu(n) ? c.push(n) : h = h.then((function() {
                            return Du(e, n), go(e.Kc, n, 
                            /*keepPersistedTargetData=*/ !0);
                        })), Po(e.Oh, n);
                    })), [ 4 /*yield*/ , h ]);

                  case 4:
                    return n.sent(), [ 4 /*yield*/ , Bu(e, c) ];

                  case 5:
                    return n.sent(), 
                    // PORTING NOTE: Multi-Tab only.
                    function(t) {
                        var e = D$1(t);
                        e.Kh.forEach((function(t, n) {
                            Po(e.Oh, n);
                        })), e.Wh.wu(), e.Kh = new Map, e.Qh = new ht(Y$1.V);
                    }(e), e.Hh = !1, [ 4 /*yield*/ , Xo(e.Oh, !1) ];

                  case 6:
                    n.sent(), n.label = 7;

                  case 7:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function Bu(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, i, o, u, s, a, c, h, f, l, p, d, v, y;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    e = D$1(t), i = [], o = [], u = 0, s = r, n.label = 1;

                  case 1:
                    return u < s.length ? (a = s[u], c = void 0, (h = e.qh.get(a)) && 0 !== h.length ? [ 4 /*yield*/ , yo(e.Kc, Pn(h[0])) ] : [ 3 /*break*/ , 7 ]) : [ 3 /*break*/ , 13 ];

                  case 2:
                    // For queries that have a local View, we fetch their current state
                    // from LocalStore (as the resume token and the snapshot version
                    // might have changed) and reconcile their views with the persisted
                    // state (the list of syncedDocuments may have gotten out of sync).
                    c = n.sent(), f = 0, l = h, n.label = 3;

                  case 3:
                    return f < l.length ? (p = l[f], d = e.Bh.get(p), [ 4 /*yield*/ , Uu(e, d) ]) : [ 3 /*break*/ , 6 ];

                  case 4:
                    (v = n.sent()).snapshot && o.push(v.snapshot), n.label = 5;

                  case 5:
                    return f++, [ 3 /*break*/ , 3 ];

                  case 6:
                    return [ 3 /*break*/ , 11 ];

                  case 7:
                    return [ 4 /*yield*/ , wo(e.Kc, a) ];

                  case 8:
                    return y = n.sent(), [ 4 /*yield*/ , yo(e.Kc, y) ];

                  case 9:
                    return c = n.sent(), [ 4 /*yield*/ , wu(e, zu(y), a, 
                    /*current=*/ !1) ];

                  case 10:
                    n.sent(), n.label = 11;

                  case 11:
                    i.push(c), n.label = 12;

                  case 12:
                    return u++, [ 3 /*break*/ , 1 ];

                  case 13:
                    return [ 2 /*return*/ , (e.Lh.Rc(o), i) ];
                }
            }));
        }));
    }

    /**
     * Creates a `Query` object from the specified `Target`. There is no way to
     * obtain the original `Query`, so we synthesize a `Query` from the `Target`
     * object.
     *
     * The synthesized result might be different from the original `Query`, but
     * since the synthesized `Query` should return the same results as the
     * original one (only the presentation of results might differ), the potential
     * difference will not cause issues.
     */
    // PORTING NOTE: Multi-Tab only.
    function zu(t) {
        return Tn(t.path, t.collectionGroup, t.orderBy, t.filters, t.limit, "F" /* First */ , t.startAt, t.endAt);
    }

    /** Returns the IDs of the clients that are currently active. */
    // PORTING NOTE: Multi-Tab only.
    function Gu(t) {
        var e = D$1(t);
        return D$1(D$1(e.Kc).persistence).Ca();
    }

    /** Applies a query target change from a different tab. */
    // PORTING NOTE: Multi-Tab only.
    function Ku(t, r, i, o) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, u, s;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return (e = D$1(t)).Hh ? (
                    // If we receive a target state notification via WebStorage, we are
                    // either already secondary or another tab has taken the primary lease.
                    T$1("SyncEngine", "Ignoring unexpected query state notification."), [ 3 /*break*/ , 8 ]) : [ 3 /*break*/ , 1 ];

                  case 1:
                    if (!e.qh.has(r)) return [ 3 /*break*/ , 8 ];
                    switch (i) {
                      case "current":
                      case "not-current":
                        return [ 3 /*break*/ , 2 ];

                      case "rejected":
                        return [ 3 /*break*/ , 5 ];
                    }
                    return [ 3 /*break*/ , 7 ];

                  case 2:
                    return [ 4 /*yield*/ , bo(e.Kc) ];

                  case 3:
                    return u = n.sent(), s = St.Yt(r, "current" === i), [ 4 /*yield*/ , Lu(e, u, s) ];

                  case 4:
                    return n.sent(), [ 3 /*break*/ , 8 ];

                  case 5:
                    return [ 4 /*yield*/ , go(e.Kc, r, 
                    /* keepPersistedTargetData */ !0) ];

                  case 6:
                    return n.sent(), Du(e, r, o), [ 3 /*break*/ , 8 ];

                  case 7:
                    S$1(), n.label = 8;

                  case 8:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /** Adds or removes Watch targets for queries from different tabs. */ function Qu(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, o, u, s, a, c, h, f, l, p;
            return __generator(this, (function(d) {
                switch (d.label) {
                  case 0:
                    if (!(e = Wu(t)).Hh) return [ 3 /*break*/ , 10 ];
                    o = 0, u = r, d.label = 1;

                  case 1:
                    return o < u.length ? (s = u[o], e.qh.has(s) ? (
                    // A target might have been added in a previous attempt
                    T$1("SyncEngine", "Adding an already active target " + s), [ 3 /*break*/ , 5 ]) : [ 4 /*yield*/ , wo(e.Kc, s) ]) : [ 3 /*break*/ , 6 ];

                  case 2:
                    return a = d.sent(), [ 4 /*yield*/ , yo(e.Kc, a) ];

                  case 3:
                    return c = d.sent(), [ 4 /*yield*/ , wu(e, zu(a), c.targetId, 
                    /*current=*/ !1) ];

                  case 4:
                    d.sent(), Oo(e.Oh, c), d.label = 5;

                  case 5:
                    return o++, [ 3 /*break*/ , 1 ];

                  case 6:
                    h = function(t) {
                        return __generator(this, (function(n) {
                            switch (n.label) {
                              case 0:
                                return e.qh.has(t) ? [ 4 /*yield*/ , go(e.Kc, t, 
                                /* keepPersistedTargetData */ !1).then((function() {
                                    Po(e.Oh, t), Du(e, t);
                                })).catch(Io) ] : [ 3 /*break*/ , 2 ];

                                // Release queries that are still active.
                                                          case 1:
                                // Release queries that are still active.
                                n.sent(), n.label = 2;

                              case 2:
                                return [ 2 /*return*/ ];
                            }
                        }));
                    }, f = 0, l = i, d.label = 7;

                  case 7:
                    return f < l.length ? (p = l[f], [ 5 /*yield**/ , h(p) ]) : [ 3 /*break*/ , 10 ];

                  case 8:
                    d.sent(), d.label = 9;

                  case 9:
                    return f++, [ 3 /*break*/ , 7 ];

                  case 10:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function Wu(t) {
        var e = D$1(t);
        return e.Oh.jc.nu = Iu.bind(null, e), e.Oh.jc.Be = Mu.bind(null, e), e.Oh.jc.eu = Tu.bind(null, e), 
        e.Lh.Rc = Tr.bind(null, e.Mh), e.Lh.Xh = Nr.bind(null, e.Mh), e;
    }

    function Yu(t) {
        var e = D$1(t);
        return e.Oh.jc.su = Nu.bind(null, e), e.Oh.jc.iu = xu.bind(null, e), e;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // TOOD(b/140938512): Drop SimpleQueryEngine and rename IndexFreeQueryEngine.
    /**
     * A query engine that takes advantage of the target document mapping in the
     * QueryCache. The IndexFreeQueryEngine optimizes query execution by only
     * reading the documents that previously matched a query plus any documents that were
     * edited after the query was last listened to.
     *
     * There are some cases where Index-Free queries are not guaranteed to produce
     * the same results as full collection scans. In these cases, the
     * IndexFreeQueryEngine falls back to full query processing. These cases are:
     *
     * - Limit queries where a document that matched the query previously no longer
     *   matches the query.
     *
     * - Limit queries where a document edit may cause the document to sort below
     *   another document that is in the local cache.
     *
     * - Queries that have never been CURRENT or free of Limbo documents.
     */ var Hu = /** @class */ function() {
        function t() {}
        return t.prototype.za = function(t) {
            this.Zh = t;
        }, t.prototype.Ui = function(t, e, n, r) {
            var i = this;
            // Queries that match all documents don't benefit from using
            // IndexFreeQueries. It is more efficient to scan all documents in a
            // collection, rather than to perform individual lookups.
                    return function(t) {
                return 0 === t.filters.length && null === t.limit && null == t.startAt && null == t.endAt && (0 === t.rn.length || 1 === t.rn.length && t.rn[0].field.B());
            }(e) || n.isEqual(z.min()) ? this.tl(t, e) : this.Zh.Li(t, r).next((function(o) {
                var s = i.el(e, o);
                return (xn(e) || An(e)) && i.ph(e.limitType, s, r, n) ? i.tl(t, e) : (E$1() <= LogLevel.DEBUG && T$1("IndexFreeQueryEngine", "Re-using previous result from %s to execute query: %s", n.toString(), Un(e)), 
                i.Zh.Ui(t, e, n).next((function(t) {
                    // We merge `previousResults` into `updateResults`, since
                    // `updateResults` is already a DocumentMap. If a document is
                    // contained in both lists, then its contents are the same.
                    return s.forEach((function(e) {
                        t = t.rt(e.key, e);
                    })), t;
                })));
            }));
            // Queries that have never seen a snapshot without limbo free documents
            // should also be run as a full collection scan.
            }, 
        /** Applies the query filter and sorting to the provided documents.  */ t.prototype.el = function(t, e) {
            // Sort the documents and re-apply the query filter since previously
            // matching documents do not necessarily still match the query.
            var n = new pt(Fn(t));
            return e.forEach((function(e, r) {
                r instanceof bn && qn(t, r) && (n = n.add(r));
            })), n;
        }, 
        /**
         * Determines if a limit query needs to be refilled from cache, making it
         * ineligible for index-free execution.
         *
         * @param sortedPreviousResults The documents that matched the query when it
         * was last synchronized, sorted by the query's comparator.
         * @param remoteKeys The document keys that matched the query at the last
         * snapshot.
         * @param limboFreeSnapshotVersion The version of the snapshot when the query
         * was last synchronized.
         */
        t.prototype.ph = function(t, e, n, r) {
            // The query needs to be refilled if a previously matching document no
            // longer matches.
            if (n.size !== e.size) return !0;
            // Limit queries are not eligible for index-free query execution if there is
            // a potential that an older document from cache now sorts before a document
            // that was previously part of the limit. This, however, can only happen if
            // the document at the edge of the limit goes out of limit.
            // If a document that is not the limit boundary sorts differently,
            // the boundary of the limit itself did not change and documents from cache
            // will continue to be "rejected" by this boundary. Therefore, we can ignore
            // any modifications that don't affect the last document.
                    var i = "F" /* First */ === t ? e.last() : e.first();
            return !!i && (i.hasPendingWrites || i.version.A(r) > 0);
        }, t.prototype.tl = function(t, e) {
            return E$1() <= LogLevel.DEBUG && T$1("IndexFreeQueryEngine", "Using full collection scan to execute query:", Un(e)), 
            this.Zh.Ui(t, e, z.min());
        }, t;
    }(), Ju = /** @class */ function() {
        function t(t, e) {
            this.Fi = t, this.Lr = e, 
            /**
                 * The set of all mutations that have been sent but not yet been applied to
                 * the backend.
                 */
            this.xi = [], 
            /** Next value to use when assigning sequential IDs to each mutation batch. */
            this.nl = 1, 
            /** An ordered mapping between documents and the mutations batch IDs. */
            this.sl = new pt(eu.cu);
        }
        return t.prototype.Ur = function(t) {
            return or.resolve(0 === this.xi.length);
        }, t.prototype.Qr = function(t, e, n, r) {
            var i = this.nl;
            this.nl++, this.xi.length > 0 && this.xi[this.xi.length - 1];
            var o = new Cr(i, e, n, r);
            this.xi.push(o);
            // Track references by document key and index collection parents.
            for (var u = 0, s = r; u < s.length; u++) {
                var a = s[u];
                this.sl = this.sl.add(new eu(a.key, i)), this.Fi.Kr(t, a.key.path.S());
            }
            return or.resolve(o);
        }, t.prototype.Wr = function(t, e) {
            return or.resolve(this.il(e));
        }, t.prototype.Gr = function(t, e) {
            var n = e + 1, r = this.rl(n), i = r < 0 ? 0 : r;
            // The requested batchId may still be out of range so normalize it to the
            // start of the queue.
                    return or.resolve(this.xi.length > i ? this.xi[i] : null);
        }, t.prototype.zr = function() {
            return or.resolve(0 === this.xi.length ? -1 : this.nl - 1);
        }, t.prototype.Hr = function(t) {
            return or.resolve(this.xi.slice());
        }, t.prototype.Mi = function(t, e) {
            var n = this, r = new eu(e, 0), i = new eu(e, Number.POSITIVE_INFINITY), o = [];
            return this.sl.Nt([ r, i ], (function(t) {
                var e = n.il(t.Eu);
                o.push(e);
            })), or.resolve(o);
        }, t.prototype.qi = function(t, e) {
            var n = this, r = new pt(V$1);
            return e.forEach((function(t) {
                var e = new eu(t, 0), i = new eu(t, Number.POSITIVE_INFINITY);
                n.sl.Nt([ e, i ], (function(t) {
                    r = r.add(t.Eu);
                }));
            })), or.resolve(this.ol(r));
        }, t.prototype.Gi = function(t, e) {
            // Use the query path as a prefix for testing if a document matches the
            // query.
            var n = e.path, r = n.length + 1, i = n;
            // Construct a document reference for actually scanning the index. Unlike
            // the prefix the document key in this reference must have an even number of
            // segments. The empty segment can be used a suffix of the query path
            // because it precedes all other segments in an ordered traversal.
                    Y$1.G(i) || (i = i.child(""));
            var o = new eu(new Y$1(i), 0), u = new pt(V$1);
            // Find unique batchIDs referenced by all documents potentially matching the
            // query.
                    return this.sl.xt((function(t) {
                var e = t.key.path;
                return !!n.N(e) && (
                // Rows with document keys more than one segment longer than the query
                // path can't be matches. For example, a query on 'rooms' can't match
                // the document /rooms/abc/messages/xyx.
                // TODO(mcg): we'll need a different scanner when we implement
                // ancestor queries.
                e.length === r && (u = u.add(t.Eu)), !0);
            }), o), or.resolve(this.ol(u));
        }, t.prototype.ol = function(t) {
            var e = this, n = [];
            // Construct an array of matching batches, sorted by batchID to ensure that
            // multiple mutations affecting the same document key are applied in order.
                    return t.forEach((function(t) {
                var r = e.il(t);
                null !== r && n.push(r);
            })), n;
        }, t.prototype.Yr = function(t, e) {
            var n = this;
            k$1(0 === this.al(e.batchId, "removed")), this.xi.shift();
            var r = this.sl;
            return or.forEach(e.mutations, (function(i) {
                var o = new eu(i.key, e.batchId);
                return r = r.delete(o), n.Lr.eo(t, i.key);
            })).next((function() {
                n.sl = r;
            }));
        }, t.prototype.Zr = function(t) {
            // No-op since the memory mutation queue does not maintain a separate cache.
        }, t.prototype.so = function(t, e) {
            var n = new eu(e, 0), r = this.sl.Ft(n);
            return or.resolve(e.isEqual(r && r.key));
        }, t.prototype.no = function(t) {
            return this.xi.length, or.resolve();
        }, 
        /**
         * Finds the index of the given batchId in the mutation queue and asserts that
         * the resulting index is within the bounds of the queue.
         *
         * @param batchId The batchId to search for
         * @param action A description of what the caller is doing, phrased in passive
         * form (e.g. "acknowledged" in a routine that acknowledges batches).
         */
        t.prototype.al = function(t, e) {
            return this.rl(t);
        }, 
        /**
         * Finds the index of the given batchId in the mutation queue. This operation
         * is O(1).
         *
         * @return The computed index of the batch with the given batchId, based on
         * the state of the queue. Note this index can be negative if the requested
         * batchId has already been remvoed from the queue or past the end of the
         * queue if the batchId is larger than the last added batch.
         */
        t.prototype.rl = function(t) {
            return 0 === this.xi.length ? 0 : t - this.xi[0].batchId;
            // Examine the front of the queue to figure out the difference between the
            // batchId and indexes in the array. Note that since the queue is ordered
            // by batchId, if the first batch has a larger batchId then the requested
            // batchId doesn't exist in the queue.
            }, 
        /**
         * A version of lookupMutationBatch that doesn't return a promise, this makes
         * other functions that uses this code easier to read and more efficent.
         */
        t.prototype.il = function(t) {
            var e = this.rl(t);
            return e < 0 || e >= this.xi.length ? null : this.xi[e];
        }, t;
    }(), Xu = /** @class */ function() {
        /**
         * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
         * return 0 to avoid unnecessarily doing the work of calculating the size.
         */
        function t(t, e) {
            this.Fi = t, this.cl = e, 
            /** Underlying cache of documents and their read times. */
            this.docs = new ht(Y$1.V), 
            /** Size of all cached documents. */
            this.size = 0
            /**
         * Adds the supplied entry to the cache and updates the cache size as appropriate.
         *
         * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()`.
         */;
        }
        return t.prototype.Ri = function(t, e, n) {
            var r = e.key, i = this.docs.get(r), o = i ? i.size : 0, u = this.cl(e);
            return this.docs = this.docs.rt(r, {
                gi: e,
                size: u,
                readTime: n
            }), this.size += u - o, this.Fi.Kr(t, r.path.S());
        }, 
        /**
         * Removes the specified entry from the cache and updates the cache size as appropriate.
         *
         * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()`.
         */
        t.prototype.Vi = function(t) {
            var e = this.docs.get(t);
            e && (this.docs = this.docs.remove(t), this.size -= e.size);
        }, t.prototype.yi = function(t, e) {
            var n = this.docs.get(e);
            return or.resolve(n ? n.gi : null);
        }, t.prototype.getEntries = function(t, e) {
            var n = this, r = gt();
            return e.forEach((function(t) {
                var e = n.docs.get(t);
                r = r.rt(t, e ? e.gi : null);
            })), or.resolve(r);
        }, t.prototype.Ui = function(t, e, n) {
            for (var r = wt(), i = new Y$1(e.path.child("")), o = this.docs._t(i)
            // Documents are ordered by key, so we can use a prefix scan to narrow down
            // the documents we need to match the query against.
            ; o.It(); ) {
                var u = o.Et(), s = u.key, a = u.value, c = a.gi, h = a.readTime;
                if (!e.path.N(s.path)) break;
                h.A(n) <= 0 || c instanceof bn && qn(e, c) && (r = r.rt(c.key, c));
            }
            return or.resolve(r);
        }, t.prototype.ul = function(t, e) {
            return or.forEach(this.docs, (function(t) {
                return e(t);
            }));
        }, t.prototype._o = function(t) {
            // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
            // a separate changelog and does not need special handling for removals.
            return new $u(this);
        }, t.prototype.wo = function(t) {
            return or.resolve(this.size);
        }, t;
    }(), $u = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).To = t, n;
        }
        return __extends(n, e), n.prototype.bi = function(t) {
            var e = this, n = [];
            return this.Ii.forEach((function(r, i) {
                i && i.gi ? n.push(e.To.Ri(t, i.gi, e.Ai(r))) : e.To.Vi(r);
            })), or.xn(n);
        }, n.prototype.pi = function(t, e) {
            return this.To.yi(t, e);
        }, n.prototype.vi = function(t, e) {
            return this.To.getEntries(t, e);
        }, n;
    }(Rr), Zu = /** @class */ function() {
        function t(t) {
            this.persistence = t, 
            /**
                 * Maps a target to the data about that target
                 */
            this.hl = new q$1((function(t) {
                return tt(t);
            }), et), 
            /** The last received snapshot version. */
            this.lastRemoteSnapshotVersion = z.min(), 
            /** The highest numbered target ID encountered. */
            this.highestTargetId = 0, 
            /** The highest sequence number encountered. */
            this.ll = 0, 
            /**
                 * A ordered bidirectional mapping between documents and the remote target
                 * IDs.
                 */
            this._l = new tu, this.targetCount = 0, this.fl = Hi.po();
        }
        return t.prototype.De = function(t, e) {
            return this.hl.forEach((function(t, n) {
                return e(n);
            })), or.resolve();
        }, t.prototype.Co = function(t) {
            return or.resolve(this.lastRemoteSnapshotVersion);
        }, t.prototype.No = function(t) {
            return or.resolve(this.ll);
        }, t.prototype.bo = function(t) {
            return this.highestTargetId = this.fl.next(), or.resolve(this.highestTargetId);
        }, t.prototype.xo = function(t, e, n) {
            return n && (this.lastRemoteSnapshotVersion = n), e > this.ll && (this.ll = e), 
            or.resolve();
        }, t.prototype.Oo = function(t) {
            this.hl.set(t.target, t);
            var e = t.targetId;
            e > this.highestTargetId && (this.fl = new Hi(e), this.highestTargetId = e), t.sequenceNumber > this.ll && (this.ll = t.sequenceNumber);
        }, t.prototype.Fo = function(t, e) {
            return this.Oo(e), this.targetCount += 1, or.resolve();
        }, t.prototype.ko = function(t, e) {
            return this.Oo(e), or.resolve();
        }, t.prototype.$o = function(t, e) {
            return this.hl.delete(e.target), this._l.du(e.targetId), this.targetCount -= 1, 
            or.resolve();
        }, t.prototype.Nr = function(t, e, n) {
            var r = this, i = 0, o = [];
            return this.hl.forEach((function(u, s) {
                s.sequenceNumber <= e && null === n.get(s.targetId) && (r.hl.delete(u), o.push(r.Lo(t, s.targetId)), 
                i++);
            })), or.xn(o).next((function() {
                return i;
            }));
        }, t.prototype.Bo = function(t) {
            return or.resolve(this.targetCount);
        }, t.prototype.qo = function(t, e) {
            var n = this.hl.get(e) || null;
            return or.resolve(n);
        }, t.prototype.Uo = function(t, e, n) {
            return this._l.lu(e, n), or.resolve();
        }, t.prototype.Ko = function(t, e, n) {
            this._l.fu(e, n);
            var r = this.persistence.Lr, i = [];
            return r && e.forEach((function(e) {
                i.push(r.eo(t, e));
            })), or.xn(i);
        }, t.prototype.Lo = function(t, e) {
            return this._l.du(e), or.resolve();
        }, t.prototype.jo = function(t, e) {
            var n = this._l.Tu(e);
            return or.resolve(n);
        }, t.prototype.so = function(t, e) {
            return or.resolve(this._l.so(e));
        }, t;
    }(), ts = /** @class */ function() {
        function t(t) {
            this.serializer = t, this.dl = new Map, this.wl = new Map;
        }
        return t.prototype.mo = function(t, e) {
            return or.resolve(this.dl.get(e));
        }, t.prototype.Ao = function(t, e) {
            /** Encodes a BundleMetadata proto object to a Bundle model object. */
            var n;
            return this.dl.set(e.id, {
                id: (n = e).id,
                version: n.version,
                createTime: le(n.createTime)
            }), or.resolve();
        }, t.prototype.Ro = function(t, e) {
            return or.resolve(this.wl.get(e));
        }, t.prototype.Po = function(t, e) {
            var n;
            return this.wl.set(e.name, {
                name: (n = e).name,
                query: hi(n.bundledQuery),
                readTime: le(n.readTime)
            }), or.resolve();
        }, t;
    }(), es = /** @class */ function() {
        /**
         * The constructor accepts a factory for creating a reference delegate. This
         * allows both the delegate and this instance to have strong references to
         * each other without having nullable fields that would then need to be
         * checked or asserted on every access.
         */
        function t(t, e) {
            var n = this;
            this.Tl = {}, this.Jo = new zr(0), this.Yo = !1, this.Yo = !0, this.Lr = t(this), 
            this.ra = new Zu(this), this.Fi = new Ei, this.Ni = function(t, e) {
                return new Xu(t, (function(t) {
                    return n.Lr.El(t);
                }));
            }(this.Fi), this.serializer = new ti(e), this.oa = new ts(this.serializer);
        }
        return t.prototype.start = function() {
            return Promise.resolve();
        }, t.prototype.pa = function() {
            // No durable state to ensure is closed on shutdown.
            return this.Yo = !1, Promise.resolve();
        }, Object.defineProperty(t.prototype, "yr", {
            get: function() {
                return this.Yo;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.fa = function() {
            // No op.
        }, t.prototype.da = function() {
            // No op.
        }, t.prototype.Oa = function() {
            return this.Fi;
        }, t.prototype.Na = function(t) {
            var e = this.Tl[t.Ys()];
            return e || (e = new Ju(this.Fi, this.Lr), this.Tl[t.Ys()] = e), e;
        }, t.prototype.xa = function() {
            return this.ra;
        }, t.prototype.Fa = function() {
            return this.Ni;
        }, t.prototype.Ma = function() {
            return this.oa;
        }, t.prototype.runTransaction = function(t, e, n) {
            var r = this;
            T$1("MemoryPersistence", "Starting transaction:", t);
            var i = new ns(this.Jo.next());
            return this.Lr.Il(), n(i).next((function(t) {
                return r.Lr.ml(i).next((function() {
                    return t;
                }));
            })).Cn().then((function(t) {
                return i.Ci(), t;
            }));
        }, t.prototype.Al = function(t, e) {
            return or.Fn(Object.values(this.Tl).map((function(n) {
                return function() {
                    return n.so(t, e);
                };
            })));
        }, t;
    }(), ns = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).Go = t, n;
        }
        return __extends(n, e), n;
    }(Fr), rs = /** @class */ function() {
        function t(t) {
            this.persistence = t, 
            /** Tracks all documents that are active in Query views. */
            this.Rl = new tu, 
            /** The list of documents that are potentially GCed after each transaction. */
            this.Pl = null;
        }
        return t.gl = function(e) {
            return new t(e);
        }, Object.defineProperty(t.prototype, "Vl", {
            get: function() {
                if (this.Pl) return this.Pl;
                throw S$1();
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.Qo = function(t, e, n) {
            return this.Rl.Qo(n, e), this.Vl.delete(n.toString()), or.resolve();
        }, t.prototype.Wo = function(t, e, n) {
            return this.Rl.Wo(n, e), this.Vl.add(n.toString()), or.resolve();
        }, t.prototype.eo = function(t, e) {
            return this.Vl.add(e.toString()), or.resolve();
        }, t.prototype.removeTarget = function(t, e) {
            var n = this;
            this.Rl.du(e.targetId).forEach((function(t) {
                return n.Vl.add(t.toString());
            }));
            var r = this.persistence.xa();
            return r.jo(t, e.targetId).next((function(t) {
                t.forEach((function(t) {
                    return n.Vl.add(t.toString());
                }));
            })).next((function() {
                return r.$o(t, e);
            }));
        }, t.prototype.Il = function() {
            this.Pl = new Set;
        }, t.prototype.ml = function(t) {
            var e = this, n = this.persistence.Fa()._o();
            // Remove newly orphaned documents.
                    return or.forEach(this.Vl, (function(r) {
                var i = Y$1.K(r);
                return e.yl(t, i).next((function(t) {
                    t || n.Vi(i);
                }));
            })).next((function() {
                return e.Pl = null, n.apply(t);
            }));
        }, t.prototype.qa = function(t, e) {
            var n = this;
            return this.yl(t, e).next((function(t) {
                t ? n.Vl.delete(e.toString()) : n.Vl.add(e.toString());
            }));
        }, t.prototype.El = function(t) {
            // For eager GC, we don't care about the document size, there are no size thresholds.
            return 0;
        }, t.prototype.yl = function(t, e) {
            var n = this;
            return or.Fn([ function() {
                return or.resolve(n.Rl.so(e));
            }, function() {
                return n.persistence.xa().so(t, e);
            }, function() {
                return n.persistence.Al(t, e);
            } ]);
        }, t;
    }(), is = /** @class */ function() {
        function t(t) {
            this.pl = t.pl, this.vl = t.vl;
        }
        return t.prototype.mc = function(t) {
            this.bl = t;
        }, t.prototype.dc = function(t) {
            this.Sl = t;
        }, t.prototype.onMessage = function(t) {
            this.Dl = t;
        }, t.prototype.close = function() {
            this.vl();
        }, t.prototype.send = function(t) {
            this.pl(t);
        }, t.prototype.Cl = function() {
            this.bl();
        }, t.prototype.Nl = function(t) {
            this.Sl(t);
        }, t.prototype.xl = function(t) {
            this.Dl(t);
        }, t;
    }(), os = {
        BatchGetDocuments: "batchGet",
        Commit: "commit",
        RunQuery: "runQuery"
    }, us = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this, t) || this).forceLongPolling = t.forceLongPolling, n.i = t.i, 
            n;
        }
        /**
         * Base class for all Rest-based connections to the backend (WebChannel and
         * HTTP).
         */
        return __extends(n, e), n.prototype.Ll = function(t, e, n, r) {
            return new Promise((function(i, o) {
                var u = new XhrIo;
                u.listenOnce(EventType.COMPLETE, (function() {
                    try {
                        switch (u.getLastErrorCode()) {
                          case ErrorCode.NO_ERROR:
                            var e = u.getResponseJson();
                            T$1("Connection", "XHR received:", JSON.stringify(e)), i(e);
                            break;

                          case ErrorCode.TIMEOUT:
                            T$1("Connection", 'RPC "' + t + '" timed out'), o(new j(F$1.DEADLINE_EXCEEDED, "Request time out"));
                            break;

                          case ErrorCode.HTTP_ERROR:
                            var n = u.getStatus();
                            if (T$1("Connection", 'RPC "' + t + '" failed with status:', n, "response text:", u.getResponseText()), 
                            n > 0) {
                                var r = u.getResponseJson().error;
                                if (r && r.status && r.message) {
                                    var s = function(t) {
                                        var e = t.toLowerCase().replace("_", "-");
                                        return Object.values(F$1).indexOf(e) >= 0 ? e : F$1.UNKNOWN;
                                    }(r.status);
                                    o(new j(s, r.message));
                                } else o(new j(F$1.UNKNOWN, "Server responded with status " + u.getStatus()));
                            } else 
                            // If we received an HTTP_ERROR but there's no status code,
                            // it's most probably a connection issue
                            o(new j(F$1.UNAVAILABLE, "Connection failed."));
                            break;

                          default:
                            S$1();
                        }
                    } finally {
                        T$1("Connection", 'RPC "' + t + '" completed.');
                    }
                }));
                var s = JSON.stringify(r);
                u.send(e, "POST", s, n, 15);
            }));
        }, n.prototype.Ac = function(t, e) {
            var n = [ this.Ol, "/", "google.firestore.v1.Firestore", "/", t, "/channel" ], r = createWebChannelTransport(), i = {
                // Required for backend stickiness, routing behavior is based on this
                // parameter.
                httpSessionIdParam: "gsessionid",
                initMessageHeaders: {},
                messageUrlParams: {
                    // This param is used to improve routing and project isolation by the
                    // backend and must be included in every request.
                    database: "projects/" + this.t.projectId + "/databases/" + this.t.database
                },
                sendRawJson: !0,
                supportsCrossDomainXhr: !0,
                internalChannelParams: {
                    // Override the default timeout (randomized between 10-20 seconds) since
                    // a large write batch on a slow internet connection may take a long
                    // time to send to the backend. Rather than have WebChannel impose a
                    // tight timeout which could lead to infinite timeouts and retries, we
                    // set it very large (5-10 minutes) and rely on the browser's builtin
                    // timeouts to kick in if the request isn't working.
                    forwardChannelRequestTimeoutMs: 6e5
                },
                forceLongPolling: this.forceLongPolling,
                detectBufferingProxy: this.i
            };
            this.$l(i.initMessageHeaders, e), 
            // Sending the custom headers we just added to request.initMessageHeaders
            // (Authorization, etc.) will trigger the browser to make a CORS preflight
            // request because the XHR will no longer meet the criteria for a "simple"
            // CORS request:
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
            // Therefore to avoid the CORS preflight request (an extra network
            // roundtrip), we use the httpHeadersOverwriteParam option to specify that
            // the headers should instead be encoded into a special "$httpHeaders" query
            // parameter, which is recognized by the webchannel backend. This is
            // formally defined here:
            // https://github.com/google/closure-library/blob/b0e1815b13fb92a46d7c9b3c30de5d6a396a3245/closure/goog/net/rpc/httpcors.js#L32
            // TODO(b/145624756): There is a backend bug where $httpHeaders isn't respected if the request
            // doesn't have an Origin header. So we have to exclude a few browser environments that are
            // known to (sometimes) not include an Origin. See
            // https://github.com/firebase/firebase-js-sdk/issues/1491.
            isMobileCordova() || isReactNative() || isElectron() || isIE() || isUWP() || isBrowserExtension() || (i.httpHeadersOverwriteParam = "$httpHeaders");
            var o = n.join("");
            T$1("Connection", "Creating WebChannel: " + o, i);
            var u = r.createWebChannel(o, i), s = !1, d = !1, v = new is({
                pl: function(t) {
                    d ? T$1("Connection", "Not sending because WebChannel is closed:", t) : (s || (T$1("Connection", "Opening WebChannel transport."), 
                    u.open(), s = !0), T$1("Connection", "WebChannel sending:", t), u.send(t));
                },
                vl: function() {
                    return u.close();
                }
            }), y = function(t, e) {
                // TODO(dimond): closure typing seems broken because WebChannel does
                // not implement goog.events.Listenable
                u.listen(t, (function(t) {
                    try {
                        e(t);
                    } catch (t) {
                        setTimeout((function() {
                            throw t;
                        }), 0);
                    }
                }));
            };
            // WebChannel supports sending the first message with the handshake - saving
            // a network round trip. However, it will have to call send in the same
            // JS event loop as open. In order to enforce this, we delay actually
            // opening the WebChannel until send is called. Whether we have called
            // open is tracked with this variable.
                    // Closure events are guarded and exceptions are swallowed, so catch any
            // exception and rethrow using a setTimeout so they become visible again.
            // Note that eventually this function could go away if we are confident
            // enough the code is exception free.
            return y(WebChannel.EventType.OPEN, (function() {
                d || T$1("Connection", "WebChannel transport opened.");
            })), y(WebChannel.EventType.CLOSE, (function() {
                d || (d = !0, T$1("Connection", "WebChannel transport closed"), v.Nl());
            })), y(WebChannel.EventType.ERROR, (function(t) {
                d || (d = !0, x$1("Connection", "WebChannel transport errored:", t), v.Nl(new j(F$1.UNAVAILABLE, "The operation could not be completed")));
            })), y(WebChannel.EventType.MESSAGE, (function(t) {
                var e;
                if (!d) {
                    var n = t.data[0];
                    k$1(!!n);
                    // TODO(b/35143891): There is a bug in One Platform that caused errors
                    // (and only errors) to be wrapped in an extra array. To be forward
                    // compatible with the bug we need to check either condition. The latter
                    // can be removed once the fix has been rolled out.
                    // Use any because msgData.error is not typed.
                    var r = n, i = r.error || (null === (e = r[0]) || void 0 === e ? void 0 : e.error);
                    if (i) {
                        T$1("Connection", "WebChannel received error:", i);
                        // error.status will be a string like 'OK' or 'NOT_FOUND'.
                        var o = i.status, s = function(t) {
                            // lookup by string
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            var e = it[t];
                            if (void 0 !== e) return ct(e);
                        }(o), a = i.message;
                        void 0 === s && (s = F$1.INTERNAL, a = "Unknown error status: " + o + " with message " + i.message), 
                        // Mark closed so no further events are propagated
                        d = !0, v.Nl(new j(s, a)), u.close();
                    } else T$1("Connection", "WebChannel received:", n), v.xl(n);
                }
            })), setTimeout((function() {
                // Technically we could/should wait for the WebChannel opened event,
                // but because we want to send the first message with the WebChannel
                // handshake we pretend the channel opened here (asynchronously), and
                // then delay the actual open until the first message is sent.
                v.Cl();
            }), 0), v;
        }, n;
    }(/** @class */ function() {
        function t(t) {
            this.Fl = t, this.t = t.t;
            var e = t.ssl ? "https" : "http";
            this.Ol = e + "://" + t.host, this.Ml = "projects/" + this.t.projectId + "/databases/" + this.t.database + "/documents";
        }
        return t.prototype.xc = function(t, e, n, r) {
            var i = this.kl(t, e);
            T$1("RestConnection", "Sending: ", i, n);
            var o = {};
            return this.$l(o, r), this.Ll(t, i, o, n).then((function(t) {
                return T$1("RestConnection", "Received: ", t), t;
            }), (function(e) {
                throw x$1("RestConnection", t + " failed with error: ", e, "url: ", i, "request:", n), 
                e;
            }));
        }, t.prototype.Fc = function(t, e, n, r) {
            // The REST API automatically aggregates all of the streamed results, so we
            // can just use the normal invoke() method.
            return this.xc(t, e, n, r);
        }, 
        /**
         * Modifies the headers for a request, adding any authorization token if
         * present and any additional headers for the request.
         */
        t.prototype.$l = function(t, e) {
            if (t["X-Goog-Api-Client"] = "gl-js/ fire/8.0.2", 
            // Content-Type: text/plain will avoid preflight requests which might
            // mess with CORS and redirects by proxies. If we add custom headers
            // we will need to change this code to potentially use the $httpOverwrite
            // parameter supported by ESF to avoid triggering preflight requests.
            t["Content-Type"] = "text/plain", e) for (var n in e.ti) e.ti.hasOwnProperty(n) && (t[n] = e.ti[n]);
        }, t.prototype.kl = function(t, e) {
            var n = os[t];
            return this.Ol + "/v1/" + e + ":" + n;
        }, t;
    }()), ss = /** @class */ function() {
        function t() {
            var t = this;
            this.Bl = function() {
                return t.ql();
            }, this.Ul = function() {
                return t.Ql();
            }, this.Kl = [], this.Wl();
        }
        return t.prototype.Xc = function(t) {
            this.Kl.push(t);
        }, t.prototype.pa = function() {
            window.removeEventListener("online", this.Bl), window.removeEventListener("offline", this.Ul);
        }, t.prototype.Wl = function() {
            window.addEventListener("online", this.Bl), window.addEventListener("offline", this.Ul);
        }, t.prototype.ql = function() {
            T$1("ConnectivityMonitor", "Network connectivity changed: AVAILABLE");
            for (var t = 0, e = this.Kl; t < e.length; t++) {
                (0, e[t])(0 /* AVAILABLE */);
            }
        }, t.prototype.Ql = function() {
            T$1("ConnectivityMonitor", "Network connectivity changed: UNAVAILABLE");
            for (var t = 0, e = this.Kl; t < e.length; t++) {
                (0, e[t])(1 /* UNAVAILABLE */);
            }
        }, 
        // TODO(chenbrian): Consider passing in window either into this component or
        // here for testing via FakeWindow.
        /** Checks that all used attributes of window are available. */
        t.kn = function() {
            return "undefined" != typeof window && void 0 !== window.addEventListener && void 0 !== window.removeEventListener;
        }, t;
    }(), as = /** @class */ function() {
        function t() {}
        return t.prototype.Xc = function(t) {
            // No-op.
        }, t.prototype.pa = function() {
            // No-op.
        }, t;
    }(), cs = /** @class */ function() {
        function t() {
            this.synchronizeTabs = !1;
        }
        return t.prototype.initialize = function(t) {
            return __awaiter(this, void 0, void 0, (function() {
                return __generator(this, (function(e) {
                    switch (e.label) {
                      case 0:
                        return this.serializer = Mr(t.Fl.t), this.kh = this.jl(t), this.persistence = this.Gl(t), 
                        [ 4 /*yield*/ , this.persistence.start() ];

                      case 1:
                        return e.sent(), this.zl = this.Hl(t), this.Kc = this.Jl(t), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, t.prototype.Hl = function(t) {
            return null;
        }, t.prototype.Jl = function(t) {
            return co(this.persistence, new Hu, t.Yl, this.serializer);
        }, t.prototype.Gl = function(t) {
            return new es(rs.gl, this.serializer);
        }, t.prototype.jl = function(t) {
            return new fu;
        }, t.prototype.terminate = function() {
            return __awaiter(this, void 0, void 0, (function() {
                return __generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.zl && this.zl.stop(), [ 4 /*yield*/ , this.kh.pa() ];

                      case 1:
                        return t.sent(), [ 4 /*yield*/ , this.persistence.pa() ];

                      case 2:
                        return t.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, t;
    }(), hs = /** @class */ function(r) {
        function i(t, e, n) {
            var i = this;
            return (i = r.call(this) || this).Xl = t, i.cacheSizeBytes = e, i.forceOwnership = n, 
            i.synchronizeTabs = !1, i;
        }
        return __extends(i, r), i.prototype.initialize = function(t) {
            return __awaiter(this, void 0, void 0, (function() {
                return __generator(this, (function(e) {
                    switch (e.label) {
                      case 0:
                        return [ 4 /*yield*/ , r.prototype.initialize.call(this, t) ];

                      case 1:
                        return e.sent(), [ 4 /*yield*/ , _o(this.Kc) ];

                      case 2:
                        return e.sent(), [ 4 /*yield*/ , this.Xl.initialize(this, t) ];

                      case 3:
                        // Enqueue writes from a previous session
                        return e.sent(), [ 4 /*yield*/ , Yu(this.Xl.gu) ];

                      case 4:
                        // Enqueue writes from a previous session
                        return e.sent(), [ 4 /*yield*/ , Go(this.Xl.Oh) ];

                      case 5:
                        return e.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, i.prototype.Jl = function(t) {
            return co(this.persistence, new Hu, t.Yl, this.serializer);
        }, i.prototype.Hl = function(t) {
            var e = this.persistence.Lr.Rr;
            return new Yr(e, t.rs);
        }, i.prototype.Gl = function(t) {
            var e = so(t.Fl.t, t.Fl.persistenceKey), n = void 0 !== this.cacheSizeBytes ? Wr.Tr(this.cacheSizeBytes) : Wr.mr;
            return new no(this.synchronizeTabs, e, t.clientId, n, t.rs, vr(), yr(), this.serializer, this.kh, !!this.forceOwnership);
        }, i.prototype.jl = function(t) {
            return new fu;
        }, i;
    }(cs), fs = /** @class */ function(r) {
        function i(t, e) {
            var n = this;
            return (n = r.call(this, t, e, /* forceOwnership= */ !1) || this).Xl = t, n.cacheSizeBytes = e, 
            n.synchronizeTabs = !0, n;
        }
        return __extends(i, r), i.prototype.initialize = function(t) {
            return __awaiter(this, void 0, void 0, (function() {
                var i, o = this;
                return __generator(this, (function(u) {
                    switch (u.label) {
                      case 0:
                        return [ 4 /*yield*/ , r.prototype.initialize.call(this, t) ];

                      case 1:
                        return u.sent(), i = this.Xl.gu, this.kh instanceof hu ? (this.kh.gu = {
                            _h: Fu.bind(null, i),
                            fh: Ku.bind(null, i),
                            dh: Qu.bind(null, i),
                            Ca: Gu.bind(null, i),
                            lh: qu.bind(null, i)
                        }, [ 4 /*yield*/ , this.kh.start() ]) : [ 3 /*break*/ , 3 ];

                      case 2:
                        u.sent(), u.label = 3;

                      case 3:
                        // NOTE: This will immediately call the listener, so we make sure to
                        // set it after localStore / remoteStore are started.
                        return [ 4 /*yield*/ , this.persistence._a((function(t) {
                            return __awaiter(o, void 0, void 0, (function() {
                                return __generator(this, (function(e) {
                                    switch (e.label) {
                                      case 0:
                                        return [ 4 /*yield*/ , ju(this.Xl.gu, t) ];

                                      case 1:
                                        return e.sent(), this.zl && (t && !this.zl.yr ? this.zl.start(this.Kc) : t || this.zl.stop()), 
                                        [ 2 /*return*/ ];
                                    }
                                }));
                            }));
                        })) ];

                      case 4:
                        // NOTE: This will immediately call the listener, so we make sure to
                        // set it after localStore / remoteStore are started.
                        return u.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, i.prototype.jl = function(t) {
            var e = vr();
            if (!hu.kn(e)) throw new j(F$1.UNIMPLEMENTED, "IndexedDB persistence is only available on platforms that support LocalStorage.");
            var n = so(t.Fl.t, t.Fl.persistenceKey);
            return new hu(e, t.rs, n, t.clientId, t.Yl);
        }, i;
    }(hs), ls = /** @class */ function() {
        function t() {}
        return t.prototype.initialize = function(t, r) {
            return __awaiter(this, void 0, void 0, (function() {
                var e = this;
                return __generator(this, (function(n) {
                    switch (n.label) {
                      case 0:
                        return this.Kc ? [ 3 /*break*/ , 2 ] : (this.Kc = t.Kc, this.kh = t.kh, this.Wc = this.Zl(r), 
                        this.Oh = this.t_(r), this.Mh = this.e_(r), this.gu = this.n_(r, 
                        /* startAsPrimary=*/ !t.synchronizeTabs), this.kh.Oc = function(t) {
                            return Eu(e.gu, t, 1 /* SharedClientState */);
                        }, this.Oh.jc.s_ = Ru.bind(null, this.gu), [ 4 /*yield*/ , Xo(this.Oh, this.gu.Jh) ]);

                      case 1:
                        n.sent(), n.label = 2;

                      case 2:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, t.prototype.e_ = function(t) {
            return new _r;
        }, t.prototype.Zl = function(t) {
            var e, n = Mr(t.Fl.t), r = (e = t.Fl, new us(e));
            /** Return the Platform-specific connectivity monitor. */ return function(t, e, n) {
                return new xo(t, e, n);
            }(t.credentials, r, n);
        }, t.prototype.t_ = function(t) {
            var e, n, r, i, o, u = this;
            return e = this.Kc, n = this.Wc, r = t.rs, i = function(t) {
                return Eu(u.gu, t, 0 /* RemoteStore */);
            }, o = ss.kn() ? new ss : new as, new So(e, n, r, i, o);
        }, t.prototype.n_ = function(t, e) {
            return function(t, e, n, 
            // PORTING NOTE: Manages state synchronization in multi-tab environments.
            r, i, o, u) {
                var s = new gu(t, e, n, r, i, o);
                return u && (s.Hh = !0), s;
            }(this.Kc, this.Oh, this.Mh, this.kh, t.Yl, t.$h, e);
        }, t.prototype.terminate = function() {
            return function(t) {
                return __awaiter(this, void 0, void 0, (function() {
                    var e;
                    return __generator(this, (function(n) {
                        switch (n.label) {
                          case 0:
                            return e = D$1(t), T$1("RemoteStore", "RemoteStore shutting down."), e.Hc.add(5 /* Shutdown */), 
                            [ 4 /*yield*/ , Do(e) ];

                          case 1:
                            return n.sent(), e.Yc.pa(), 
                            // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
                            // triggering spurious listener events with cached data, etc.
                            e.Zc.set("Unknown" /* Unknown */), [ 2 /*return*/ ];
                        }
                    }));
                }));
            }(this.Oh);
        }, t;
    }(), ps = /** @class */ function() {
        function t(t) {
            this.observer = t, 
            /**
                 * When set to true, will not raise future events. Necessary to deal with
                 * async detachment of listener.
                 */
            this.muted = !1;
        }
        return t.prototype.next = function(t) {
            this.observer.next && this.i_(this.observer.next, t);
        }, t.prototype.error = function(t) {
            this.observer.error ? this.i_(this.observer.error, t) : console.error("Uncaught Error in snapshot listener:", t);
        }, t.prototype.r_ = function() {
            this.muted = !0;
        }, t.prototype.i_ = function(t, e) {
            var n = this;
            this.muted || setTimeout((function() {
                n.muted || t(e);
            }), 0);
        }, t;
    }(), ds = function(t) {
        this.o_ = t;
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function vs(t, e, n) {
        if (!n) throw new j(F$1.INVALID_ARGUMENT, "Function " + t + "() cannot be called with an empty " + e + ".");
    }

    function ys(t, e) {
        if (void 0 === e) return {
            merge: !1
        };
        if (void 0 !== e.mergeFields && void 0 !== e.merge) throw new j(F$1.INVALID_ARGUMENT, "Invalid options passed to function " + t + '(): You cannot specify both "merge" and "mergeFields".');
        return e;
    }

    /**
     * Validates that two boolean options are not set at the same time.
     */ function gs(t, e, n, r) {
        if (!0 === e && !0 === r) throw new j(F$1.INVALID_ARGUMENT, t + " and " + n + " cannot be used together.");
    }

    /**
     * Returns true if it's a non-null object without a custom prototype
     * (i.e. excludes Array, Date, etc.).
     */
    /** Returns a string describing the type / value of the provided input. */ function ms(t) {
        if (void 0 === t) return "undefined";
        if (null === t) return "null";
        if ("string" == typeof t) return t.length > 20 && (t = t.substring(0, 20) + "..."), 
        JSON.stringify(t);
        if ("number" == typeof t || "boolean" == typeof t) return "" + t;
        if ("object" == typeof t) {
            if (t instanceof Array) return "an array";
            var e = 
            /** Hacky method to try to get the constructor name for an object. */
            function(t) {
                if (t.constructor) {
                    var e = /function\s+([^\s(]+)\s*\(/.exec(t.constructor.toString());
                    if (e && e.length > 1) return e[1];
                }
                return null;
            }(t);
            return e ? "a custom " + e + " object" : "an object";
        }
        return "function" == typeof t ? "a function" : S$1();
    }

    function ws(t, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e) {
        if (t instanceof ds && (t = t.o_), !(t instanceof e)) {
            if (e.name === t.constructor.name) throw new j(F$1.INVALID_ARGUMENT, "Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");
            var n = ms(t);
            throw new j(F$1.INVALID_ARGUMENT, "Expected type '" + e.name + "', but it was: " + n);
        }
        return t;
    }

    function bs(t, e) {
        if (e <= 0) throw new j(F$1.INVALID_ARGUMENT, "Function " + t + "() requires a positive number, but it was: " + e + ".");
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Sentinel values that can be used when writing document fields with `set()`
     * or `update()`.
     */ var _s = 
    /**
         * @param _methodName The public API endpoint that returns this class.
         */
    function(t) {
        this.a_ = t;
    }, Is = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return __extends(n, e), n.prototype.c_ = function(t) {
            if (2 /* MergeSet */ !== t.u_) throw 1 /* Update */ === t.u_ ? t.h_(this.a_ + "() can only appear at the top level of your update data") : t.h_(this.a_ + "() cannot be used with set() unless you pass {merge:true}");
            // No transform to add for a delete, but we need to add it to our
            // fieldMask so it gets deleted.
                    return t.Qe.push(t.path), null;
        }, n.prototype.isEqual = function(t) {
            return t instanceof n;
        }, n;
    }(_s);

    /**
     * Returns a sentinel for use with {@link updateDoc()} or
     * {@link setDoc `setDoc({}, { merge: true })`} to mark a field for deletion.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Creates a child context for parsing SerializableFieldValues.
     *
     * This is different than calling `ParseContext.contextWith` because it keeps
     * the fieldTransforms and fieldMask separate.
     *
     * The created context has its `dataSource` set to `UserDataSource.Argument`.
     * Although these values are used with writes, any elements in these FieldValues
     * are not considered writes since they cannot contain any FieldValue sentinels,
     * etc.
     *
     * @param fieldValue The sentinel FieldValue for which to create a child
     *     context.
     * @param context The parent context.
     * @param arrayElement Whether or not the FieldValue has an array.
     */
    function Es(t, e, n) {
        return new Hs({
            u_: 3 /* Argument */ ,
            l_: e.settings.l_,
            methodName: t.a_,
            __: n
        }, e.t, e.serializer, e.ignoreUndefinedProperties);
    }

    var Ts = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return __extends(n, e), n.prototype.c_ = function(t) {
            return new Xe(t.path, new Be);
        }, n.prototype.isEqual = function(t) {
            return t instanceof n;
        }, n;
    }(_s), Ns = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, t) || this).f_ = n, r;
        }
        return __extends(n, e), n.prototype.c_ = function(t) {
            var e = Es(this, t, 
            /*array=*/ !0), n = this.f_.map((function(t) {
                return ea$1(t, e);
            })), r = new ze(n);
            return new Xe(t.path, r);
        }, n.prototype.isEqual = function(t) {
            // TODO(mrschmidt): Implement isEquals
            return this === t;
        }, n;
    }(_s), xs = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, t) || this).f_ = n, r;
        }
        return __extends(n, e), n.prototype.c_ = function(t) {
            var e = Es(this, t, 
            /*array=*/ !0), n = this.f_.map((function(t) {
                return ea$1(t, e);
            })), r = new Ke(n);
            return new Xe(t.path, r);
        }, n.prototype.isEqual = function(t) {
            // TODO(mrschmidt): Implement isEquals
            return this === t;
        }, n;
    }(_s), As = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, t) || this).d_ = n, r;
        }
        return __extends(n, e), n.prototype.c_ = function(t) {
            var e = new We(t.serializer, ae(t.serializer, this.d_));
            return new Xe(t.path, e);
        }, n.prototype.isEqual = function(t) {
            // TODO(mrschmidt): Implement isEquals
            return this === t;
        }, n;
    }(_s), Ss = /** @class */ function() {
        /**
         * Creates a new immutable `GeoPoint` object with the provided latitude and
         * longitude values.
         * @param latitude The latitude as number between -90 and 90.
         * @param longitude The longitude as number between -180 and 180.
         */
        function t(t, e) {
            if (!isFinite(t) || t < -90 || t > 90) throw new j(F$1.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + t);
            if (!isFinite(e) || e < -180 || e > 180) throw new j(F$1.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + e);
            this.w_ = t, this.T_ = e;
        }
        return Object.defineProperty(t.prototype, "latitude", {
            /**
             * The latitude of this `GeoPoint` instance.
             */
            get: function() {
                return this.w_;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "longitude", {
            /**
             * The longitude of this `GeoPoint` instance.
             */
            get: function() {
                return this.T_;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Returns true if this `GeoPoint` is equal to the provided one.
         *
         * @param other The `GeoPoint` to compare against.
         * @return true if this `GeoPoint` is equal to the provided one.
         */
        t.prototype.isEqual = function(t) {
            return this.w_ === t.w_ && this.T_ === t.T_;
        }, t.prototype.toJSON = function() {
            return {
                latitude: this.w_,
                longitude: this.T_
            };
        }, 
        /**
         * Actually private to JS consumers of our API, so this function is prefixed
         * with an underscore.
         */
        t.prototype.I = function(t) {
            return V$1(this.w_, t.w_) || V$1(this.T_, t.T_);
        }, t;
    }(), ks = /** @class */ function() {
        function t(t) {
            this.E_ = t;
        }
        /**
         * Creates a new `Bytes` object from the given Base64 string, converting it to
         * bytes.
         *
         * @param base64 The Base64 string used to create the `Bytes` object.
         */    return t.fromBase64String = function(e) {
            try {
                return new t(rt.fromBase64String(e));
            } catch (e) {
                throw new j(F$1.INVALID_ARGUMENT, "Failed to construct Bytes from Base64 string: " + e);
            }
        }, 
        /**
         * Creates a new `Bytes` object from the given Uint8Array.
         *
         * @param array The Uint8Array used to create the `Bytes` object.
         */
        t.fromUint8Array = function(e) {
            return new t(rt.fromUint8Array(e));
        }, 
        /**
         * Returns the underlying bytes as a Base64-encoded string.
         *
         * @return The Base64-encoded string created from the `Bytes` object.
         */
        t.prototype.toBase64 = function() {
            return this.E_.toBase64();
        }, 
        /**
         * Returns the underlying bytes in a new `Uint8Array`.
         *
         * @return The Uint8Array created from the `Bytes` object.
         */
        t.prototype.toUint8Array = function() {
            return this.E_.toUint8Array();
        }, 
        /**
         * Returns a string representation of the `Bytes` object.
         *
         * @return A string representation of the `Bytes` object.
         */
        t.prototype.toString = function() {
            return "Bytes(base64: " + this.toBase64() + ")";
        }, 
        /**
         * Returns true if this `Bytes` object is equal to the provided one.
         *
         * @param other The `Bytes` object to compare against.
         * @return true if this `Bytes` object is equal to the provided one.
         */
        t.prototype.isEqual = function(t) {
            return this.E_.isEqual(t.E_);
        }, t;
    }(), Ds = new Map, Os = /** @class */ function() {
        function t(t) {
            var e;
            if (void 0 === t.host) {
                if (void 0 !== t.ssl) throw new j(F$1.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
                this.host = "firestore.googleapis.com", this.ssl = !0;
            } else this.host = t.host, this.ssl = null === (e = t.ssl) || void 0 === e || e;
            if (this.credentials = t.credentials, this.ignoreUndefinedProperties = !!t.ignoreUndefinedProperties, 
            void 0 === t.cacheSizeBytes) this.cacheSizeBytes = 41943040; else {
                if (-1 !== t.cacheSizeBytes && t.cacheSizeBytes < 1048576) throw new j(F$1.INVALID_ARGUMENT, "cacheSizeBytes must be at least 1048576");
                this.cacheSizeBytes = t.cacheSizeBytes;
            }
            this.experimentalForceLongPolling = !!t.experimentalForceLongPolling, this.experimentalAutoDetectLongPolling = !!t.experimentalAutoDetectLongPolling, 
            gs("experimentalForceLongPolling", t.experimentalForceLongPolling, "experimentalAutoDetectLongPolling", t.experimentalAutoDetectLongPolling);
        }
        return t.prototype.isEqual = function(t) {
            return this.host === t.host && this.ssl === t.ssl && this.credentials === t.credentials && this.cacheSizeBytes === t.cacheSizeBytes && this.experimentalForceLongPolling === t.experimentalForceLongPolling && this.experimentalAutoDetectLongPolling === t.experimentalAutoDetectLongPolling && this.ignoreUndefinedProperties === t.ignoreUndefinedProperties;
        }, t;
    }();

    /**
     * The Cloud Firestore service interface.
     *
     * Do not call this constructor directly. Instead, use {@link getFirestore()}.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Helper function to assert Uint8Array is available at runtime. */
    function Ps() {
        if ("undefined" == typeof Uint8Array) throw new j(F$1.UNIMPLEMENTED, "Uint8Arrays are not available in this environment.");
    }

    /** Helper function to assert Base64 functions are available at runtime. */ function Vs() {
        if ("undefined" == typeof atob) throw new j(F$1.UNIMPLEMENTED, "Blobs are unavailable in Firestore in this environment.");
    }

    /**
     * Immutable class holding a blob (binary data).
     *
     * This class is directly exposed in the public API. It extends the Bytes class
     * of the firestore-exp API to support `instanceof Bytes` checks during user
     * data conversion.
     *
     * Note that while you can't hide the constructor in JavaScript code, we are
     * using the hack above to make sure no-one outside this module can call it.
     */ var Cs = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return __extends(n, e), n.fromBase64String = function(t) {
            Vs();
            try {
                return new n(rt.fromBase64String(t));
            } catch (t) {
                throw new j(F$1.INVALID_ARGUMENT, "Failed to construct Blob from Base64 string: " + t);
            }
        }, n.fromUint8Array = function(t) {
            return Ps(), new n(rt.fromUint8Array(t));
        }, n.prototype.toBase64 = function() {
            return Vs(), e.prototype.toBase64.call(this);
        }, n.prototype.toUint8Array = function() {
            return Ps(), e.prototype.toUint8Array.call(this);
        }, n.prototype.toString = function() {
            return "Blob(base64: " + this.toBase64() + ")";
        }, n;
    }(ks), Ls = /** @class */ function() {
        function t() {}
        return t.prototype.I_ = function(t, e) {
            switch (void 0 === e && (e = "none"), jt(t)) {
              case 0 /* NullValue */ :
                return null;

              case 1 /* BooleanValue */ :
                return t.booleanValue;

              case 2 /* NumberValue */ :
                return Ht(t.integerValue || t.doubleValue);

              case 3 /* TimestampValue */ :
                return this.m_(t.timestampValue);

              case 4 /* ServerTimestampValue */ :
                return this.A_(t, e);

              case 5 /* StringValue */ :
                return t.stringValue;

              case 6 /* BlobValue */ :
                return this.R_(Jt(t.bytesValue));

              case 7 /* RefValue */ :
                return this.P_(t.referenceValue);

              case 8 /* GeoPointValue */ :
                return this.g_(t.geoPointValue);

              case 9 /* ArrayValue */ :
                return this.V_(t.arrayValue, e);

              case 10 /* ObjectValue */ :
                return this.y_(t.mapValue, e);

              default:
                throw S$1();
            }
        }, t.prototype.y_ = function(t, e) {
            var n = this, r = {};
            return M$1(t.fields || {}, (function(t, i) {
                r[t] = n.I_(i, e);
            })), r;
        }, t.prototype.g_ = function(t) {
            return new Ss(Ht(t.latitude), Ht(t.longitude));
        }, t.prototype.V_ = function(t, e) {
            var n = this;
            return (t.values || []).map((function(t) {
                return n.I_(t, e);
            }));
        }, t.prototype.A_ = function(t, e) {
            switch (e) {
              case "previous":
                var n = Ut(t);
                return null == n ? null : this.I_(n, e);

              case "estimate":
                return this.m_(qt(t));

              default:
                return null;
            }
        }, t.prototype.m_ = function(t) {
            var e = Yt(t);
            return new B(e.seconds, e.nanos);
        }, t.prototype.p_ = function(t, e) {
            var n = K$1.k(t);
            k$1(Me(n));
            var r = new _(n.get(1), n.get(3)), i = new Y$1(n.v(5));
            return r.isEqual(e) || 
            // TODO(b/64130202): Somehow support foreign references.
            N$1("Document " + i + " contains a document reference within a different database (" + r.projectId + "/" + r.database + ") which is not supported. It will be treated as a reference in the current database (" + e.projectId + "/" + e.database + ") instead."), 
            i;
        }, t;
    }(), Rs = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).firestore = t, n;
        }
        return __extends(n, e), n.prototype.R_ = function(t) {
            return new Cs(t);
        }, n.prototype.P_ = function(t) {
            var e = this.p_(t, this.firestore.v_);
            return za$1.b_(e, this.firestore, /* converter= */ null);
        }, n;
    }(Ls), Ms = /** @class */ function() {
        // Note: This class is stripped down version of the DocumentSnapshot in
        // the legacy SDK. The changes are:
        // - No support for SnapshotMetadata.
        // - No support for SnapshotOptions.
        function t(t, e, n, r, i) {
            this.S_ = t, this.D_ = e, this.C_ = n, this.N_ = r, this.x_ = i;
        }
        return Object.defineProperty(t.prototype, "id", {
            /** Property of the `DocumentSnapshot` that provides the document's ID. */ get: function() {
                return this.C_.path.C();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "ref", {
            /**
             * The `DocumentReference` for the document included in the `DocumentSnapshot`.
             */
            get: function() {
                return new js(this.S_, this.x_, this.C_);
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Signals whether or not the document at the snapshot's location exists.
         *
         * @return true if the document exists.
         */
        t.prototype.exists = function() {
            return null !== this.N_;
        }, 
        /**
         * Retrieves all fields in the document as an `Object`. Returns `undefined` if
         * the document doesn't exist.
         *
         * @return An `Object` containing all fields in the document or `undefined`
         * if the document doesn't exist.
         */
        t.prototype.data = function() {
            if (this.N_) {
                if (this.x_) {
                    // We only want to use the converter and create a new DocumentSnapshot
                    // if a converter has been provided.
                    var t = new Us(this.S_, this.D_, this.C_, this.N_, 
                    /* converter= */ null);
                    return this.x_.fromFirestore(t);
                }
                return this.D_.I_(this.N_.sn());
            }
        }, 
        /**
         * Retrieves the field specified by `fieldPath`. Returns `undefined` if the
         * document or field doesn't exist.
         *
         * @param fieldPath The path (for example 'foo' or 'foo.bar') to a specific
         * field.
         * @return The data at the specified field location or undefined if no such
         * field exists in the document.
         */
        // We are using `any` here to avoid an explicit cast by our users.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        t.prototype.get = function(t) {
            if (this.N_) {
                var e = this.N_.data().field(qs("DocumentSnapshot.get", t));
                if (null !== e) return this.D_.I_(e);
            }
        }, t;
    }(), Us = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        /**
         * Retrieves all fields in the document as an `Object`.
         *
         * @override
         * @return An `Object` containing all fields in the document.
         */    return __extends(n, e), n.prototype.data = function() {
            return e.prototype.data.call(this);
        }, n;
    }(Ms);

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Converts Firestore's internal types to the JavaScript types that we expose
     * to the user.
     */
    /**
     * Helper that calls fromDotSeparatedString() but wraps any error thrown.
     */
    function qs(t, e) {
        return "string" == typeof e ? sa$1(t, e) : e instanceof ds ? e.o_.F_ : e.F_;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A `FieldPath` refers to a field in a document. The path may consist of a
     * single field name (referring to a top-level field in the document), or a
     * list of field names (referring to a nested field in the document).
     *
     * Create a `FieldPath` by providing field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     */ var Fs = /** @class */ function() {
        /**
         * Creates a FieldPath from the provided field names. If more than one field
         * name is provided, the path will point to a nested field in a document.
         *
         * @param fieldNames A list of field names.
         */
        function t() {
            for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
            for (var n = 0; n < t.length; ++n) if (0 === t[n].length) throw new j(F$1.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
            this.F_ = new W$1(t);
        }
        /**
         * Returns true if this `FieldPath` is equal to the provided one.
         *
         * @param other The `FieldPath` to compare against.
         * @return true if this `FieldPath` is equal to the provided one.
         */    return t.prototype.isEqual = function(t) {
            return this.F_.isEqual(t.F_);
        }, t;
    }(), js = /** @class */ function() {
        function t(t, e, n) {
            this.x_ = e, this.C_ = n, 
            /** The type of this Firestore reference. */
            this.type = "document", this.firestore = t;
        }
        return Object.defineProperty(t.prototype, "O_", {
            get: function() {
                return this.C_.path;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "id", {
            /**
             * The document's identifier within its collection.
             */
            get: function() {
                return this.C_.path.C();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "path", {
            /**
             * A string representing the path of the referenced document (relative
             * to the root of the database).
             */
            get: function() {
                return this.C_.path.M();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "parent", {
            /**
             * The collection this `DocumentReference` belongs to.
             */
            get: function() {
                return new zs(this.firestore, this.x_, this.C_.path.S());
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Applies a custom data converter to this `DocumentReference`, allowing you
         * to use your own custom model objects with Firestore. When you call {@link
         * setDoc()}, {@link getDoc()}, etc. with the returned `DocumentReference`
         * instance, the provided converter will convert between Firestore data and
         * your custom type `U`.
         *
         * @param converter Converts objects to and from Firestore.
         * @return A `DocumentReference<U>` that uses the provided converter.
         */
        t.prototype.withConverter = function(e) {
            return new t(this.firestore, e, this.C_);
        }, t;
    }(), Bs = /** @class */ function() {
        // This is the lite version of the Query class in the main SDK.
        function t(t, e, n) {
            this.x_ = e, this.M_ = n, 
            /** The type of this Firestore reference. */
            this.type = "query", this.firestore = t
            /**
         * Applies a custom data converter to this query, allowing you to use your own
         * custom model objects with Firestore. When you call {@link getDocs()} with
         * the returned query, the provided converter will convert between Firestore
         * data and your custom type `U`.
         *
         * @param converter Converts objects to and from Firestore.
         * @return A `Query<U>` that uses the provided converter.
         */;
        }
        return t.prototype.withConverter = function(e) {
            return new t(this.firestore, e, this.M_);
        }, t;
    }(), zs = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this, t, n, Nn(r)) || this).firestore = t, i.O_ = r, i.type = "collection", 
            i;
        }
        return __extends(n, e), Object.defineProperty(n.prototype, "id", {
            /** The collection's identifier. */ get: function() {
                return this.M_.path.C();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "path", {
            /**
             * A string representing the path of the referenced collection (relative
             * to the root of the database).
             */
            get: function() {
                return this.M_.path.M();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "parent", {
            /**
             * A reference to the containing `DocumentReference` if this is a
             * subcollection. If this isn't a subcollection, the reference is null.
             */
            get: function() {
                var t = this.O_.S();
                return t.T() ? null : new js(this.firestore, 
                /* converter= */ null, new Y$1(t));
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Applies a custom data converter to this CollectionReference, allowing you
         * to use your own custom model objects with Firestore. When you call {@link
         * addDoc()} with the returned `CollectionReference` instance, the provided
         * converter will convert between Firestore data and your custom type `U`.
         *
         * @param converter Converts objects to and from Firestore.
         * @return A `CollectionReference<U>` that uses the provided converter.
         */
        n.prototype.withConverter = function(t) {
            return new n(this.firestore, t, this.O_);
        }, n;
    }(Bs);

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A `DocumentReference` refers to a document location in a Firestore database
     * and can be used to write, read, or listen to the location. The document at
     * the referenced location may or may not exist.
     */
    /**
     * Returns true if the provided references are equal.
     *
     * @param left A reference to compare.
     * @param right A reference to compare.
     * @return true if the references point to the same location in the same
     * Firestore database.
     */
    function Gs(t) {
        var e = t.k_(), n = Mr(t.v_);
        return new Js(t.v_, !!e.ignoreUndefinedProperties, n);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var Ks = /^__.*__$/, Qs = /** @class */ function() {
        function t(t, e, n) {
            this.data = t, this.Qe = e, this.fieldTransforms = n;
        }
        return t.prototype.L_ = function(t, e) {
            var n = [];
            return null !== this.Qe ? n.push(new cn(t, this.data, this.Qe, e)) : n.push(new an(t, this.data, e)), 
            this.fieldTransforms.length > 0 && n.push(new fn(t, this.fieldTransforms)), n;
        }, t;
    }(), Ws = /** @class */ function() {
        function t(t, e, n) {
            this.data = t, this.Qe = e, this.fieldTransforms = n;
        }
        return t.prototype.L_ = function(t, e) {
            var n = [ new cn(t, this.data, this.Qe, e) ];
            return this.fieldTransforms.length > 0 && n.push(new fn(t, this.fieldTransforms)), 
            n;
        }, t;
    }();

    /** The result of parsing document data (e.g. for a setData call). */ function Ys(t) {
        switch (t) {
          case 0 /* Set */ :
     // fall through
                  case 2 /* MergeSet */ :
     // fall through
                  case 1 /* Update */ :
            return !0;

          case 3 /* Argument */ :
          case 4 /* ArrayArgument */ :
            return !1;

          default:
            throw S$1();
        }
    }

    /** A "context" object passed around while parsing user data. */ var Hs = /** @class */ function() {
        /**
         * Initializes a ParseContext with the given source and path.
         *
         * @param settings The settings for the parser.
         * @param databaseId The database ID of the Firestore instance.
         * @param serializer The serializer to use to generate the Value proto.
         * @param ignoreUndefinedProperties Whether to ignore undefined properties
         * rather than throw.
         * @param fieldTransforms A mutable list of field transforms encountered while
         *     parsing the data.
         * @param fieldMask A mutable list of field paths encountered while parsing
         *     the data.
         *
         * TODO(b/34871131): We don't support array paths right now, so path can be
         * null to indicate the context represents any location within an array (in
         * which case certain features will not work and errors will be somewhat
         * compromised).
         */
        function t(t, e, n, r, i, o) {
            this.settings = t, this.t = e, this.serializer = n, this.ignoreUndefinedProperties = r, 
            // Minor hack: If fieldTransforms is undefined, we assume this is an
            // external call and we need to validate the entire path.
            void 0 === i && this.B_(), this.fieldTransforms = i || [], this.Qe = o || [];
        }
        return Object.defineProperty(t.prototype, "path", {
            get: function() {
                return this.settings.path;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "u_", {
            get: function() {
                return this.settings.u_;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /** Returns a new context with the specified settings overwritten. */ t.prototype.q_ = function(e) {
            return new t(Object.assign(Object.assign({}, this.settings), e), this.t, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.Qe);
        }, t.prototype.U_ = function(t) {
            var e, n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), r = this.q_({
                path: n,
                __: !1
            });
            return r.Q_(t), r;
        }, t.prototype.K_ = function(t) {
            var e, n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), r = this.q_({
                path: n,
                __: !1
            });
            return r.B_(), r;
        }, t.prototype.W_ = function(t) {
            // TODO(b/34871131): We don't support array paths right now; so make path
            // undefined.
            return this.q_({
                path: void 0,
                __: !0
            });
        }, t.prototype.h_ = function(t) {
            return aa$1(t, this.settings.methodName, this.settings.j_ || !1, this.path, this.settings.l_);
        }, 
        /** Returns 'true' if 'fieldPath' was traversed when creating this context. */ t.prototype.contains = function(t) {
            return void 0 !== this.Qe.find((function(e) {
                return t.N(e);
            })) || void 0 !== this.fieldTransforms.find((function(e) {
                return t.N(e.field);
            }));
        }, t.prototype.B_ = function() {
            // TODO(b/34871131): Remove null check once we have proper paths for fields
            // within arrays.
            if (this.path) for (var t = 0; t < this.path.length; t++) this.Q_(this.path.get(t));
        }, t.prototype.Q_ = function(t) {
            if (0 === t.length) throw this.h_("Document fields must not be empty");
            if (Ys(this.u_) && Ks.test(t)) throw this.h_('Document fields cannot begin and end with "__"');
        }, t;
    }(), Js = /** @class */ function() {
        function t(t, e, n) {
            this.t = t, this.ignoreUndefinedProperties = e, this.serializer = n || Mr(t)
            /** Creates a new top-level parse context. */;
        }
        return t.prototype.G_ = function(t, e, n, r) {
            return void 0 === r && (r = !1), new Hs({
                u_: t,
                methodName: e,
                l_: n,
                path: W$1.$(),
                __: !1,
                j_: r
            }, this.t, this.serializer, this.ignoreUndefinedProperties);
        }, t;
    }();

    /**
     * Helper for parsing raw user input (provided via the API) into internal model
     * classes.
     */
    /** Parse document data from a set() call. */ function Xs(t, e, n, r, i, o) {
        void 0 === o && (o = {});
        var u = t.G_(o.merge || o.mergeFields ? 2 /* MergeSet */ : 0 /* Set */ , e, n, i);
        ia("Data must be an object, but it was:", u, r);
        var s, a, c = na$1(r, u);
        if (o.merge) s = new Je(u.Qe), a = u.fieldTransforms; else if (o.mergeFields) {
            for (var h = [], f = 0, l = o.mergeFields; f < l.length; f++) {
                var p = oa$1(e, l[f], n);
                if (!u.contains(p)) throw new j(F$1.INVALID_ARGUMENT, "Field '" + p + "' is specified in your field mask but missing from your input data.");
                ca$1(h, p) || h.push(p);
            }
            s = new Je(h), a = u.fieldTransforms.filter((function(t) {
                return s.He(t.field);
            }));
        } else s = null, a = u.fieldTransforms;
        return new Qs(new yn(c), s, a);
    }

    /** Parse update data from an update() call. */ function $s(t, e, n, r) {
        var i = t.G_(1 /* Update */ , e, n);
        ia("Data must be an object, but it was:", i, r);
        var o = [], u = new gn;
        M$1(r, (function(t, r) {
            var s = sa$1(e, t, n);
            // For Compat types, we have to "extract" the underlying types before
            // performing validation.
                    r instanceof ds && (r = r.o_);
            var a = i.K_(s);
            if (r instanceof Is) 
            // Add it to the field mask, but don't add anything to updateData.
            o.push(s); else {
                var c = ea$1(r, a);
                null != c && (o.push(s), u.set(s, c));
            }
        }));
        var s = new Je(o);
        return new Ws(u.Ye(), s, i.fieldTransforms);
    }

    /** Parse update data from a list of field/value arguments. */ function Zs(t, e, n, r, i, o) {
        var u = t.G_(1 /* Update */ , e, n), s = [ oa$1(e, r, n) ], a = [ i ];
        if (o.length % 2 != 0) throw new j(F$1.INVALID_ARGUMENT, "Function " + e + "() needs to be called with an even number of arguments that alternate between field names and values.");
        for (var c = 0; c < o.length; c += 2) s.push(oa$1(e, o[c])), a.push(o[c + 1]);
        // We iterate in reverse order to pick the last value for a field if the
        // user specified the field multiple times.
        for (var h = [], f = new gn, l = s.length - 1; l >= 0; --l) if (!ca$1(h, s[l])) {
            var p = s[l], d = a[l];
            // For Compat types, we have to "extract" the underlying types before
            // performing validation.
            d instanceof ds && (d = d.o_);
            var v = u.K_(p);
            if (d instanceof Is) 
            // Add it to the field mask, but don't add anything to updateData.
            h.push(p); else {
                var y = ea$1(d, v);
                null != y && (h.push(p), f.set(p, y));
            }
        }
        var g = new Je(h);
        return new Ws(f.Ye(), g, u.fieldTransforms);
    }

    /**
     * Parse a "query value" (e.g. value in a where filter or a value in a cursor
     * bound).
     *
     * @param allowArrays Whether the query value is an array that may directly
     * contain additional arrays (e.g. the operand of an `in` query).
     */ function ta$1(t, e, n, r) {
        return void 0 === r && (r = !1), ea$1(n, t.G_(r ? 4 /* ArrayArgument */ : 3 /* Argument */ , e));
    }

    /**
     * Parses user data to Protobuf Values.
     *
     * @param input Data to be parsed.
     * @param context A context object representing the current path being parsed,
     * the source of the data being parsed, etc.
     * @return The parsed value, or null if the value was a FieldValue sentinel
     * that should not be included in the resulting parsed data.
     */ function ea$1(t, e) {
        if (
        // Unwrap the API type from the Compat SDK. This will return the API type
        // from firestore-exp.
        t instanceof ds && (t = t.o_), ra$1(t)) return ia("Unsupported field value:", e, t), 
        na$1(t, e);
        if (t instanceof _s) 
        // FieldValues usually parse into transforms (except FieldValue.delete())
        // in which case we do not want to include this field in our parsed data
        // (as doing so will overwrite the field directly prior to the transform
        // trying to transform it). So we don't add this location to
        // context.fieldMask and we return null as our parsing result.
        /**
         * "Parses" the provided FieldValueImpl, adding any necessary transforms to
         * context.fieldTransforms.
         */
        return function(t, e) {
            // Sentinels are only supported with writes, and not within arrays.
            if (!Ys(e.u_)) throw e.h_(t.a_ + "() can only be used with update() and set()");
            if (!e.path) throw e.h_(t.a_ + "() is not currently supported inside arrays");
            var n = t.c_(e);
            n && e.fieldTransforms.push(n);
        }(t, e), null;
        if (
        // If context.path is null we are inside an array and we don't support
        // field mask paths more granular than the top-level array.
        e.path && e.Qe.push(e.path), t instanceof Array) {
            // TODO(b/34871131): Include the path containing the array in the error
            // message.
            // In the case of IN queries, the parsed data is an array (representing
            // the set of values to be included for the IN query) that may directly
            // contain additional arrays (each representing an individual field
            // value), so we disable this validation.
            if (e.settings.__ && 4 /* ArrayArgument */ !== e.u_) throw e.h_("Nested arrays are not supported");
            return function(t, e) {
                for (var n = [], r = 0, i = 0, o = t; i < o.length; i++) {
                    var u = ea$1(o[i], e.W_(r));
                    null == u && (
                    // Just include nulls in the array for fields being replaced with a
                    // sentinel.
                    u = {
                        nullValue: "NULL_VALUE"
                    }), n.push(u), r++;
                }
                return {
                    arrayValue: {
                        values: n
                    }
                };
            }(t, e);
        }
        return function(t, e) {
            if (t instanceof ds && (t = t.o_), null === t) return {
                nullValue: "NULL_VALUE"
            };
            if ("number" == typeof t) return ae(e.serializer, t);
            if ("boolean" == typeof t) return {
                booleanValue: t
            };
            if ("string" == typeof t) return {
                stringValue: t
            };
            if (t instanceof Date) {
                var n = B.fromDate(t);
                return {
                    timestampValue: ce(e.serializer, n)
                };
            }
            if (t instanceof B) {
                // Firestore backend truncates precision down to microseconds. To ensure
                // offline mode works the same with regards to truncation, perform the
                // truncation immediately without waiting for the backend to do that.
                var r = new B(t.seconds, 1e3 * Math.floor(t.nanoseconds / 1e3));
                return {
                    timestampValue: ce(e.serializer, r)
                };
            }
            if (t instanceof Ss) return {
                geoPointValue: {
                    latitude: t.latitude,
                    longitude: t.longitude
                }
            };
            if (t instanceof ks) return {
                bytesValue: he(e.serializer, t.E_)
            };
            if (t instanceof js) {
                var i = e.t, o = t.firestore.v_;
                if (!o.isEqual(i)) throw e.h_("Document reference is for database " + o.projectId + "/" + o.database + " but should be for database " + i.projectId + "/" + i.database);
                return {
                    referenceValue: pe(t.firestore.v_ || e.t, t.C_.path)
                };
            }
            if (void 0 === t && e.ignoreUndefinedProperties) return null;
            throw e.h_("Unsupported field value: " + ms(t));
        }(t, e);
    }

    function na$1(t, e) {
        var n = {};
        return U$1(t) ? 
        // If we encounter an empty object, we explicitly add it to the update
        // mask to ensure that the server creates a map entry.
        e.path && e.path.length > 0 && e.Qe.push(e.path) : M$1(t, (function(t, r) {
            var i = ea$1(r, e.U_(t));
            null != i && (n[t] = i);
        })), {
            mapValue: {
                fields: n
            }
        };
    }

    function ra$1(t) {
        return !("object" != typeof t || null === t || t instanceof Array || t instanceof Date || t instanceof B || t instanceof Ss || t instanceof ks || t instanceof js || t instanceof _s);
    }

    function ia(t, e, n) {
        if (!ra$1(n) || !function(t) {
            return "object" == typeof t && null !== t && (Object.getPrototypeOf(t) === Object.prototype || null === Object.getPrototypeOf(t));
        }(n)) {
            var r = ms(n);
            throw "an object" === r ? e.h_(t + " a custom object") : e.h_(t + " " + r);
        }
    }

    /**
     * Helper that calls fromDotSeparatedString() but wraps any error thrown.
     */ function oa$1(t, e, n) {
        if (
        // If required, replace the FieldPath Compat class with with the firestore-exp
        // FieldPath.
        e instanceof ds && (e = e.o_), e instanceof Fs) return e.F_;
        if ("string" == typeof e) return sa$1(t, e);
        throw aa$1("Field path arguments must be of type string or FieldPath.", t, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, n);
    }

    /**
     * Matches any characters in a field path string that are reserved.
     */ var ua$1 = new RegExp("[~\\*/\\[\\]]");

    /**
     * Wraps fromDotSeparatedString with an error message about the method that
     * was thrown.
     * @param methodName The publicly visible method name
     * @param path The dot-separated string form of a field path which will be split
     * on dots.
     * @param targetDoc The document against which the field path will be evaluated.
     */ function sa$1(t, e, n) {
        if (e.search(ua$1) >= 0) throw aa$1("Invalid field path (" + e + "). Paths must not contain '~', '*', '/', '[', or ']'", t, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, n);
        try {
            return (new (Fs.bind.apply(Fs, __spreadArrays([ void 0 ], e.split("."))))).F_;
        } catch (r) {
            throw aa$1("Invalid field path (" + e + "). Paths must not be empty, begin with '.', end with '.', or contain '..'", t, 
            /* hasConverter= */ !1, 
            /* path= */ void 0, n);
        }
    }

    function aa$1(t, e, n, r, i) {
        var o = r && !r.T(), u = void 0 !== i, s = "Function " + e + "() called with invalid data";
        n && (s += " (via `toFirestore()`)");
        var a = "";
        return (o || u) && (a += " (found", o && (a += " in field " + r), u && (a += " in document " + i), 
        a += ")"), new j(F$1.INVALID_ARGUMENT, (s += ". ") + t + a)
        /** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */;
    }

    function ca$1(t, e) {
        return t.some((function(t) {
            return t.isEqual(e);
        }));
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Internal transaction object responsible for accumulating the mutations to
     * perform and the base versions for any documents read.
     */ var ha$1 = /** @class */ function() {
        function t(t) {
            this.Wc = t, 
            // The version of each document that was read during this transaction.
            this.z_ = new Map, this.mutations = [], this.H_ = !1, 
            /**
                 * A deferred usage error that occurred previously in this transaction that
                 * will cause the transaction to fail once it actually commits.
                 */
            this.J_ = null, 
            /**
                 * Set of documents that have been written in the transaction.
                 *
                 * When there's more than one write to the same key in a transaction, any
                 * writes after the first are handled differently.
                 */
            this.Y_ = new Set;
        }
        return t.prototype.X_ = function(t) {
            return __awaiter(this, void 0, void 0, (function() {
                var r, i = this;
                return __generator(this, (function(o) {
                    switch (o.label) {
                      case 0:
                        if (this.Z_(), this.mutations.length > 0) throw new j(F$1.INVALID_ARGUMENT, "Firestore transactions require all reads to be executed before all writes.");
                        return [ 4 /*yield*/ , function(t, r) {
                            return __awaiter(this, void 0, void 0, (function() {
                                var e, i, o, u, s, a;
                                return __generator(this, (function(n) {
                                    switch (n.label) {
                                      case 0:
                                        return e = D$1(t), i = we(e.serializer) + "/documents", o = {
                                            documents: r.map((function(t) {
                                                return ve(e.serializer, t);
                                            }))
                                        }, [ 4 /*yield*/ , e.Fc("BatchGetDocuments", i, o) ];

                                      case 1:
                                        return u = n.sent(), s = new Map, u.forEach((function(t) {
                                            var n = function(t, e) {
                                                return "found" in e ? function(t, e) {
                                                    k$1(!!e.found), e.found.name, e.found.updateTime;
                                                    var n = ye(t, e.found.name), r = le(e.found.updateTime), i = new yn({
                                                        mapValue: {
                                                            fields: e.found.fields
                                                        }
                                                    });
                                                    return new bn(n, r, i, {});
                                                }(t, e) : "missing" in e ? function(t, e) {
                                                    k$1(!!e.missing), k$1(!!e.readTime);
                                                    var n = ye(t, e.missing), r = le(e.readTime);
                                                    return new _n(n, r);
                                                }(t, e) : S$1();
                                            }(e.serializer, t);
                                            s.set(n.key.toString(), n);
                                        })), a = [], [ 2 /*return*/ , (r.forEach((function(t) {
                                            var e = s.get(t.toString());
                                            k$1(!!e), a.push(e);
                                        })), a) ];
                                    }
                                }));
                            }));
                        }(this.Wc, t) ];

                      case 1:
                        return [ 2 /*return*/ , ((r = o.sent()).forEach((function(t) {
                            t instanceof _n || t instanceof bn ? i.tf(t) : S$1();
                        })), r) ];
                    }
                }));
            }));
        }, t.prototype.set = function(t, e) {
            this.write(e.L_(t, this.je(t))), this.Y_.add(t.toString());
        }, t.prototype.update = function(t, e) {
            try {
                this.write(e.L_(t, this.ef(t)));
            } catch (t) {
                this.J_ = t;
            }
            this.Y_.add(t.toString());
        }, t.prototype.delete = function(t) {
            this.write([ new dn(t, this.je(t)) ]), this.Y_.add(t.toString());
        }, t.prototype.commit = function() {
            return __awaiter(this, void 0, void 0, (function() {
                var t, r = this;
                return __generator(this, (function(i) {
                    switch (i.label) {
                      case 0:
                        if (this.Z_(), this.J_) throw this.J_;
                        return t = this.z_, 
                        // For each mutation, note that the doc was written.
                        this.mutations.forEach((function(e) {
                            t.delete(e.key.toString());
                        })), 
                        // For each document that was read but not written to, we want to perform
                        // a `verify` operation.
                        t.forEach((function(t, e) {
                            var n = Y$1.K(e);
                            r.mutations.push(new vn(n, r.je(n)));
                        })), [ 4 /*yield*/ , function(t, r) {
                            return __awaiter(this, void 0, void 0, (function() {
                                var e, i, o;
                                return __generator(this, (function(n) {
                                    switch (n.label) {
                                      case 0:
                                        return e = D$1(t), i = we(e.serializer) + "/documents", o = {
                                            writes: r.map((function(t) {
                                                return Ie(e.serializer, t);
                                            }))
                                        }, [ 4 /*yield*/ , e.xc("Commit", i, o) ];

                                      case 1:
                                        return n.sent(), [ 2 /*return*/ ];
                                    }
                                }));
                            }));
                        }(this.Wc, this.mutations) ];

                      case 1:
                        // For each mutation, note that the doc was written.
                        return i.sent(), this.H_ = !0, [ 2 /*return*/ ];
                    }
                }));
            }));
        }, t.prototype.tf = function(t) {
            var e;
            if (t instanceof bn) e = t.version; else {
                if (!(t instanceof _n)) throw S$1();
                // For deleted docs, we must use baseVersion 0 when we overwrite them.
                            e = z.min();
            }
            var n = this.z_.get(t.key.toString());
            if (n) {
                if (!e.isEqual(n)) 
                // This transaction will fail no matter what.
                throw new j(F$1.ABORTED, "Document version changed between two reads.");
            } else this.z_.set(t.key.toString(), e);
        }, 
        /**
         * Returns the version of this document when it was read in this transaction,
         * as a precondition, or no precondition if it was not read.
         */
        t.prototype.je = function(t) {
            var e = this.z_.get(t.toString());
            return !this.Y_.has(t.toString()) && e ? Ze.updateTime(e) : Ze.Ge();
        }, 
        /**
         * Returns the precondition for a document if the operation is an update.
         */
        t.prototype.ef = function(t) {
            var e = this.z_.get(t.toString());
            // The first time a document is written, we want to take into account the
            // read time and existence
                    if (!this.Y_.has(t.toString()) && e) {
                if (e.isEqual(z.min())) 
                // The document doesn't exist, so fail the transaction.
                // This has to be validated locally because you can't send a
                // precondition that a document does not exist without changing the
                // semantics of the backend write to be an insert. This is the reverse
                // of what we want, since we want to assert that the document doesn't
                // exist but then send the update and have it fail. Since we can't
                // express that to the backend, we have to validate locally.
                // Note: this can change once we can send separate verify writes in the
                // transaction.
                throw new j(F$1.INVALID_ARGUMENT, "Can't update a document that doesn't exist.");
                // Document exists, base precondition on document update time.
                            return Ze.updateTime(e);
            }
            // Document was not read, so we just use the preconditions for a blind
            // update.
                    return Ze.exists(!0);
        }, t.prototype.write = function(t) {
            this.Z_(), this.mutations = this.mutations.concat(t);
        }, t.prototype.Z_ = function() {}, t;
    }(), fa$1 = /** @class */ function() {
        function t(t, e, n, r) {
            this.rs = t, this.Wc = e, this.updateFunction = n, this.us = r, this.nf = 5, this.Ps = new ir(this.rs, "transaction_retry" /* TransactionRetry */)
            /** Runs the transaction and sets the result on deferred. */;
        }
        return t.prototype.run = function() {
            this.sf();
        }, t.prototype.sf = function() {
            var t = this;
            this.Ps.An((function() {
                return __awaiter(t, void 0, void 0, (function() {
                    var t, e, r = this;
                    return __generator(this, (function(n) {
                        return t = new ha$1(this.Wc), (e = this.rf(t)) && e.then((function(e) {
                            r.rs.fs((function() {
                                return t.commit().then((function() {
                                    r.us.resolve(e);
                                })).catch((function(t) {
                                    r.af(t);
                                }));
                            }));
                        })).catch((function(t) {
                            r.af(t);
                        })), [ 2 /*return*/ ];
                    }));
                }));
            }));
        }, t.prototype.rf = function(t) {
            try {
                var e = this.updateFunction(t);
                return !H$1(e) && e.catch && e.then ? e : (this.us.reject(Error("Transaction callback must return a Promise")), 
                null);
            } catch (t) {
                // Do not retry errors thrown by user provided updateFunction.
                return this.us.reject(t), null;
            }
        }, t.prototype.af = function(t) {
            var e = this;
            this.nf > 0 && this.cf(t) ? (this.nf -= 1, this.rs.fs((function() {
                return e.sf(), Promise.resolve();
            }))) : this.us.reject(t);
        }, t.prototype.cf = function(t) {
            if ("FirebaseError" === t.name) {
                // In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
                // non-matching document versions with ABORTED. These errors should be retried.
                var e = t.code;
                return "aborted" === e || "failed-precondition" === e || !at(e);
            }
            return !1;
        }, t;
    }(), la$1 = /** @class */ function() {
        function t(t, 
        /**
         * Asynchronous queue responsible for all of our internal processing. When
         * we get incoming work from the user (via public API) or the network
         * (incoming GRPC messages), we should always schedule onto this queue.
         * This ensures all of our work is properly serialized (e.g. we don't
         * start processing a new operation while the previous one is waiting for
         * an async I/O to complete).
         */
        e, n) {
            var r = this;
            this.credentials = t, this.rs = e, this.Fl = n, this.user = Sr.UNAUTHENTICATED, 
            this.clientId = P$1.u(), this.uf = function() {}, this.oi = new rr, this.credentials.si((function(t) {
                T$1("FirestoreClient", "Received user=", t.uid), r.user.isEqual(t) || (r.user = t, 
                r.uf(t)), r.oi.resolve();
            }));
        }
        return t.prototype.getConfiguration = function() {
            return __awaiter(this, void 0, void 0, (function() {
                return __generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return [ 4 /*yield*/ , this.oi.promise ];

                      case 1:
                        return [ 2 /*return*/ , (t.sent(), {
                            rs: this.rs,
                            Fl: this.Fl,
                            clientId: this.clientId,
                            credentials: this.credentials,
                            Yl: this.user,
                            $h: 100
                        }) ];
                    }
                }));
            }));
        }, t.prototype.hf = function(t) {
            var e = this;
            this.uf = t, 
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.oi.promise.then((function() {
                return e.uf(e.user);
            }));
        }, 
        /**
         * Checks that the client has not been terminated. Ensures that other methods on
         * this class cannot be called after the client is terminated.
         */
        t.prototype.lf = function() {
            if (this.rs.Vs) throw new j(F$1.FAILED_PRECONDITION, "The client has already been terminated.");
        }, t.prototype.terminate = function() {
            var t = this;
            this.rs.bs();
            var r = new rr;
            return this.rs.ys((function() {
                return __awaiter(t, void 0, void 0, (function() {
                    var t, e;
                    return __generator(this, (function(n) {
                        switch (n.label) {
                          case 0:
                            return n.trys.push([ 0, 5, , 6 ]), this._f ? [ 4 /*yield*/ , this._f.terminate() ] : [ 3 /*break*/ , 2 ];

                          case 1:
                            n.sent(), n.label = 2;

                          case 2:
                            return this.ff ? [ 4 /*yield*/ , this.ff.terminate() ] : [ 3 /*break*/ , 4 ];

                          case 3:
                            n.sent(), n.label = 4;

                          case 4:
                            // `removeChangeListener` must be called after shutting down the
                            // RemoteStore as it will prevent the RemoteStore from retrieving
                            // auth tokens.
                            return this.credentials.ii(), r.resolve(), [ 3 /*break*/ , 6 ];

                          case 5:
                            return t = n.sent(), e = wr(t, "Failed to shutdown persistence"), r.reject(e), [ 3 /*break*/ , 6 ];

                          case 6:
                            return [ 2 /*return*/ ];
                        }
                    }));
                }));
            })), r.promise;
        }, t;
    }();

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * TransactionRunner encapsulates the logic needed to run and retry transactions
     * with backoff.
     */ function pa$1(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var i, o = this;
            return __generator(this, (function(u) {
                switch (u.label) {
                  case 0:
                    return t.rs.Ns(), T$1("FirestoreClient", "Initializing OfflineComponentProvider"), 
                    [ 4 /*yield*/ , t.getConfiguration() ];

                  case 1:
                    return i = u.sent(), [ 4 /*yield*/ , r.initialize(i) ];

                  case 2:
                    return u.sent(), t.hf((function(i) {
                        return t.rs.Ss((function() {
                            return __awaiter(o, void 0, void 0, (function() {
                                return __generator(this, (function(t) {
                                    switch (t.label) {
                                      case 0:
                                        return [ 4 /*yield*/ , ho(r.Kc, i) ];

                                      case 1:
                                        return t.sent(), [ 2 /*return*/ ];
                                    }
                                }));
                            }));
                        }));
                    })), 
                    // When a user calls clearPersistence() in one client, all other clients
                    // need to be terminated to allow the delete to succeed.
                    r.persistence.fa((function() {
                        return t.terminate();
                    })), t.ff = r, [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function da$1(t, r) {
        return __awaiter(this, void 0, void 0, (function() {
            var i, o;
            return __generator(this, (function(u) {
                switch (u.label) {
                  case 0:
                    return t.rs.Ns(), [ 4 /*yield*/ , va(t) ];

                  case 1:
                    return i = u.sent(), T$1("FirestoreClient", "Initializing OnlineComponentProvider"), 
                    [ 4 /*yield*/ , t.getConfiguration() ];

                  case 2:
                    return o = u.sent(), [ 4 /*yield*/ , r.initialize(i, o) ];

                  case 3:
                    return u.sent(), 
                    // The CredentialChangeListener of the online component provider takes
                    // precedence over the offline component provider.
                    t.hf((function(i) {
                        return t.rs.Ss((function() {
                            return function(t, r) {
                                return __awaiter(this, void 0, void 0, (function() {
                                    var e, i;
                                    return __generator(this, (function(n) {
                                        switch (n.label) {
                                          case 0:
                                            return (e = D$1(t)).rs.Ns(), T$1("RemoteStore", "RemoteStore received new credentials"), 
                                            i = Mo(e), 
                                            // Tear down and re-create our network streams. This will ensure we get a
                                            // fresh auth token for the new user and re-fill the write pipeline with
                                            // new mutations from the LocalStore (since mutations are per-user).
                                            e.Hc.add(3 /* CredentialChange */), [ 4 /*yield*/ , Do(e) ];

                                          case 1:
                                            return n.sent(), i && 
                                            // Don't set the network status to Unknown if we are offline.
                                            e.Zc.set("Unknown" /* Unknown */), [ 4 /*yield*/ , e.jc.s_(r) ];

                                          case 2:
                                            return n.sent(), e.Hc.delete(3 /* CredentialChange */), [ 4 /*yield*/ , ko(e) ];

                                          case 3:
                                            // Tear down and re-create our network streams. This will ensure we get a
                                            // fresh auth token for the new user and re-fill the write pipeline with
                                            // new mutations from the LocalStore (since mutations are per-user).
                                            return n.sent(), [ 2 /*return*/ ];
                                        }
                                    }));
                                }));
                            }(r.Oh, i);
                        }));
                    })), t._f = r, [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function va(t) {
        return __awaiter(this, void 0, void 0, (function() {
            return __generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return t.ff ? [ 3 /*break*/ , 2 ] : (T$1("FirestoreClient", "Using default OfflineComponentProvider"), 
                    [ 4 /*yield*/ , pa$1(t, new cs) ]);

                  case 1:
                    e.sent(), e.label = 2;

                  case 2:
                    return [ 2 /*return*/ , t.ff ];
                }
            }));
        }));
    }

    function ya$1(t) {
        return __awaiter(this, void 0, void 0, (function() {
            return __generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return t._f ? [ 3 /*break*/ , 2 ] : (T$1("FirestoreClient", "Using default OnlineComponentProvider"), 
                    [ 4 /*yield*/ , da$1(t, new ls) ]);

                  case 1:
                    e.sent(), e.label = 2;

                  case 2:
                    return [ 2 /*return*/ , t._f ];
                }
            }));
        }));
    }

    function ga(t) {
        return va(t).then((function(t) {
            return t.persistence;
        }));
    }

    function ma(t) {
        return va(t).then((function(t) {
            return t.Kc;
        }));
    }

    function wa(t) {
        return ya$1(t).then((function(t) {
            return t.Oh;
        }));
    }

    function ba$1(t) {
        return ya$1(t).then((function(t) {
            return t.gu;
        }));
    }

    function _a$2(t) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, r;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return [ 4 /*yield*/ , ya$1(t) ];

                  case 1:
                    return e = n.sent(), [ 2 /*return*/ , ((r = e.Mh).Ls = mu.bind(null, e.gu), r.Us = bu.bind(null, e.gu), 
                    r) ];
                }
            }));
        }));
    }

    /** Enables the network connection and re-enqueues all pending operations. */ function Ia$1(t, r) {
        var i = this, o = new rr;
        return t.rs.fs((function() {
            return __awaiter(i, void 0, void 0, (function() {
                var e;
                return __generator(this, (function(n) {
                    switch (n.label) {
                      case 0:
                        return e = _u, [ 4 /*yield*/ , ba$1(t) ];

                      case 1:
                        return [ 2 /*return*/ , e.apply(void 0, [ n.sent(), r, o ]) ];
                    }
                }));
            }));
        })), o.promise
        /**
     * Takes an updateFunction in which a set of reads and writes can be performed
     * atomically. In the updateFunction, the client can read and write values
     * using the supplied transaction object. After the updateFunction, all
     * changes will be committed. If a retryable error occurs (ex: some other
     * client has changed any of the data referenced), then the updateFunction
     * will be called again after a backoff. If the updateFunction still fails
     * after all retries, then the transaction will be rejected.
     *
     * The transaction object passed to the updateFunction contains methods for
     * accessing documents and collections. Unlike other datastore access, data
     * accessed with the transaction will not reflect local changes that have not
     * been committed. For this reason, it is required that all reads are
     * performed before any writes. Transactions must be performed while online.
     */;
    }

    function Ea$1(t, r, i) {
        return __awaiter(this, void 0, void 0, (function() {
            var e, o, u;
            return __generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return n.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , function(t, e) {
                        var n = D$1(t);
                        return n.persistence.runTransaction("read document", "readonly", (function(t) {
                            return n.Ga.Oi(t, e);
                        }));
                    }(t, r) ];

                  case 1:
                    return (e = n.sent()) instanceof bn ? i.resolve(e) : e instanceof _n ? i.resolve(null) : i.reject(new j(F$1.UNAVAILABLE, "Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)")), 
                    [ 3 /*break*/ , 3 ];

                  case 2:
                    return o = n.sent(), u = wr(o, "Failed to get document '" + r + " from cache"), 
                    i.reject(u), [ 3 /*break*/ , 3 ];

                  case 3:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Retrieves a latency-compensated document from the backend via a
     * SnapshotListener.
     */ function Ta$1(t, e, n, r, i) {
        var o = new ps({
            next: function(o) {
                // Remove query first before passing event to user to avoid
                // user actions affecting the now stale query.
                e.fs((function() {
                    return Er(t, u);
                }));
                var s = o.docs.has(n);
                !s && o.fromCache ? 
                // TODO(dimond): If we're online and the document doesn't
                // exist then we resolve with a doc.exists set to false. If
                // we're offline however, we reject the Promise in this
                // case. Two options: 1) Cache the negative response from
                // the server so we can deliver that even when you're
                // offline 2) Actually reject the Promise in the online case
                // if the document doesn't exist.
                i.reject(new j(F$1.UNAVAILABLE, "Failed to get document because the client is offline.")) : s && o.fromCache && r && "server" === r.source ? i.reject(new j(F$1.UNAVAILABLE, 'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')) : i.resolve(o);
            },
            error: function(t) {
                return i.reject(t);
            }
        }), u = new Ar(Nn(n.path), o, {
            includeMetadataChanges: !0,
            Hs: !0
        });
        return Ir(t, u);
    }

    /**
     * The Cloud Firestore service interface.
     *
     * Do not call this constructor directly. Instead, use {@link getFirestore()}.
     */ var Na$1 = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, t, n) || this).yf = new mr, r.df = "name" in t ? t.name : "[DEFAULT]", 
            r;
        }
        return __extends(n, e), n.prototype.Vf = function() {
            return this.pf || 
            // The client must be initialized to ensure that all subsequent API
            // usage throws an exception.
            Fa$1(this), this.pf.terminate();
        }, n;
    }(/** @class */ function() {
        function t(t, e) {
            this.df = "(lite)", this.wf = new Os({}), this.Tf = !1, t instanceof _ ? (this.v_ = t, 
            this.Ef = new Dr) : (this.If = t, this.v_ = function(t) {
                if (!Object.prototype.hasOwnProperty.apply(t.options, [ "projectId" ])) throw new j(F$1.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
                return new _(t.options.projectId);
            }(t), this.Ef = new Or(e));
        }
        return Object.defineProperty(t.prototype, "app", {
            /**
             * The {@link FirebaseApp app} associated with this `Firestore` service
             * instance.
             */
            get: function() {
                if (!this.If) throw new j(F$1.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
                return this.If;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "mf", {
            get: function() {
                return this.Tf;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "Af", {
            get: function() {
                return void 0 !== this.Rf;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.Pf = function(t) {
            if (this.Tf) throw new j(F$1.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");
            this.wf = new Os(t), void 0 !== t.credentials && (this.Ef = function(t) {
                if (!t) return new Dr;
                switch (t.type) {
                  case "gapi":
                    var e = t.client;
                    // Make sure this really is a Gapi client.
                                    return k$1(!("object" != typeof e || null === e || !e.auth || !e.auth.getAuthHeaderValueForFirstParty)), 
                    new Vr(e, t.sessionIndex || "0");

                  case "provider":
                    return t.client;

                  default:
                    throw new j(F$1.INVALID_ARGUMENT, "makeCredentialsProvider failed due to invalid credential type");
                }
            }(t.credentials));
        }, t.prototype.gf = function() {
            return this.wf;
        }, t.prototype.k_ = function() {
            return this.Tf = !0, this.wf;
        }, t.prototype._delete = function() {
            return this.Rf || (this.Rf = this.Vf()), this.Rf;
        }, 
        /**
         * Terminates all components used by this client. Subclasses can override
         * this method to clean up their own dependencies, but must also call this
         * method.
         *
         * Only ever called once.
         */
        t.prototype.Vf = function() {
            /**
     * Removes all components associated with the provided instance. Must be called
     * when the `Firestore` instance is terminated.
     */
            return function(t) {
                var e = Ds.get(t);
                e && (T$1("ComponentProvider", "Removing Datastore"), Ds.delete(t), e.terminate());
            }(this), Promise.resolve();
        }, t;
    }());

    /**
     * Attempts to enable persistent storage, if possible.
     *
     * Must be called before any other functions (other than
     * {@link initializeFirestore()}, {@link getFirestore()} or
     * {@link clearIndexedDbPersistence()}.
     *
     * If this fails, `enableIndexedDbPersistence()` will reject the promise it
     * returns. Note that even after this failure, the `Firestore` instance will
     * remain usable, however offline persistence will be disabled.
     *
     * There are several reasons why this can fail, which can be identified by
     * the `code` on the error.
     *
     *   * failed-precondition: The app is already open in another browser tab.
     *   * unimplemented: The browser is incompatible with the offline
     *     persistence implementation.
     *
     * @param firestore The `Firestore` instance to enable persistence for.
     * @param persistenceSettings Optional settings object to configure persistence.
     * @return A promise that represents successfully enabling persistent storage.
     */
    /**
     * Registers both the `OfflineComponentProvider` and `OnlineComponentProvider`.
     * If the operation fails with a recoverable error (see
     * `canRecoverFromIndexedDbError()` below), the returned Promise is rejected
     * but the client remains usable.
     */ function xa$1(t, r, i) {
        var o = this, u = new rr;
        return t.rs.enqueue((function() {
            return __awaiter(o, void 0, void 0, (function() {
                var e;
                return __generator(this, (function(n) {
                    switch (n.label) {
                      case 0:
                        return n.trys.push([ 0, 3, , 4 ]), [ 4 /*yield*/ , pa$1(t, i) ];

                      case 1:
                        return n.sent(), [ 4 /*yield*/ , da$1(t, r) ];

                      case 2:
                        return n.sent(), u.resolve(), [ 3 /*break*/ , 4 ];

                      case 3:
                        if (!
                        /**
             * Decides whether the provided error allows us to gracefully disable
             * persistence (as opposed to crashing the client).
             */
                        function(t) {
                            return "FirebaseError" === t.name ? t.code === F$1.FAILED_PRECONDITION || t.code === F$1.UNIMPLEMENTED : !("undefined" != typeof DOMException && t instanceof DOMException) || (22 === t.code || 20 === t.code || 
                            // Firefox Private Browsing mode disables IndexedDb and returns
                            // INVALID_STATE for any usage.
                            11 === t.code);
                        }(e = n.sent())) throw e;
                        return console.warn("Error enabling offline persistence. Falling back to persistence disabled: " + e), 
                        u.reject(e), [ 3 /*break*/ , 4 ];

                      case 4:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        })).then((function() {
            return u.promise;
        }));
    }

    /**
     * Re-enables use of the network for this Firestore instance after a prior
     * call to {@link disableNetwork()}.
     *
     * @return A promise that is resolved once the network has been enabled.
     */
    function Aa$1(t) {
        if (t.mf || t.Af) throw new j(F$1.FAILED_PRECONDITION, "Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A `DocumentSnapshot` contains data read from a document in your Firestore
     * database. The data can be extracted with `.data()` or `.get(<field>)` to
     * get a specific field.
     *
     * For a `DocumentSnapshot` that points to a non-existing document, any data
     * access will return 'undefined'. You can use the `exists()` method to
     * explicitly verify a document's existence.
     */ var Sa$1 = /** @class */ function(e) {
        function n(t, n, r, i, o, u) {
            var s = this;
            return (s = e.call(this, t, n, r, i, u) || this).S_ = t, s.vf = t, s.metadata = o, 
            s;
        }
        /**
         * Property of the `DocumentSnapshot` that signals whether or not the data
         * exists. True if the document exists.
         */    return __extends(n, e), n.prototype.exists = function() {
            return e.prototype.exists.call(this);
        }, 
        /**
         * Retrieves all fields in the document as an `Object`. Returns `undefined` if
         * the document doesn't exist.
         *
         * By default, `FieldValue.serverTimestamp()` values that have not yet been
         * set to their final value will be returned as `null`. You can override
         * this by passing an options object.
         *
         * @param options An options object to configure how data is retrieved from
         * the snapshot (for example the desired behavior for server timestamps that
         * have not yet been set to their final value).
         * @return An `Object` containing all fields in the document or `undefined` if
         * the document doesn't exist.
         */
        n.prototype.data = function(t) {
            if (void 0 === t && (t = {}), this.N_) {
                if (this.x_) {
                    // We only want to use the converter and create a new DocumentSnapshot
                    // if a converter has been provided.
                    var e = new ka$1(this.S_, this.D_, this.C_, this.N_, this.metadata, 
                    /* converter= */ null);
                    return this.x_.fromFirestore(e, t);
                }
                return this.D_.I_(this.N_.sn(), t.serverTimestamps);
            }
        }, 
        /**
         * Retrieves the field specified by `fieldPath`. Returns `undefined` if the
         * document or field doesn't exist.
         *
         * By default, a `FieldValue.serverTimestamp()` that has not yet been set to
         * its final value will be returned as `null`. You can override this by
         * passing an options object.
         *
         * @param fieldPath The path (for example 'foo' or 'foo.bar') to a specific
         * field.
         * @param options An options object to configure how the field is retrieved
         * from the snapshot (for example the desired behavior for server timestamps
         * that have not yet been set to their final value).
         * @return The data at the specified field location or undefined if no such
         * field exists in the document.
         */
        // We are using `any` here to avoid an explicit cast by our users.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        n.prototype.get = function(t, e) {
            if (void 0 === e && (e = {}), this.N_) {
                var n = this.N_.data().field(qs("DocumentSnapshot.get", t));
                if (null !== n) return this.D_.I_(n, e.serverTimestamps);
            }
        }, n;
    }(Ms), ka$1 = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        /**
         * Retrieves all fields in the document as an `Object`.
         *
         * By default, `FieldValue.serverTimestamp()` values that have not yet been
         * set to their final value will be returned as `null`. You can override
         * this by passing an options object.
         *
         * @override
         * @param options An options object to configure how data is retrieved from
         * the snapshot (for example the desired behavior for server timestamps that
         * have not yet been set to their final value).
         * @return An `Object` containing all fields in the document.
         */    return __extends(n, e), n.prototype.data = function(t) {
            return void 0 === t && (t = {}), e.prototype.data.call(this, t);
        }, n;
    }(Sa$1), Da$1 = /** @class */ function() {
        function t(t, e, n, r) {
            this.S_ = t, this.D_ = e, this.bf = r, this.metadata = new Ka$1(r.hasPendingWrites, r.fromCache), 
            this.query = n;
        }
        return Object.defineProperty(t.prototype, "docs", {
            /** An array of all the documents in the `QuerySnapshot`. */ get: function() {
                var t = [];
                return this.forEach((function(e) {
                    return t.push(e);
                })), t;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "size", {
            /** The number of documents in the `QuerySnapshot`. */ get: function() {
                return this.bf.docs.size;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "empty", {
            /** True if there are no documents in the `QuerySnapshot`. */ get: function() {
                return 0 === this.size;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Enumerates all of the documents in the `QuerySnapshot`.
         *
         * @param callback A callback to be called with a `QueryDocumentSnapshot` for
         * each document in the snapshot.
         * @param thisArg The `this` binding for the callback.
         */
        t.prototype.forEach = function(t, e) {
            var n = this;
            this.bf.docs.forEach((function(r) {
                t.call(e, new ka$1(n.S_, n.D_, r.key, r, new Ka$1(n.bf.Qt.has(r.key), n.bf.fromCache), n.query.x_));
            }));
        }, 
        /**
         * Returns an array of the documents changes since the last snapshot. If this
         * is the first snapshot, all documents will be in the list as 'added'
         * changes.
         *
         * @param options `SnapshotListenOptions` that control whether metadata-only
         * changes (i.e. only `DocumentSnapshot.metadata` changed) should trigger
         * snapshot events.
         */
        t.prototype.docChanges = function(t) {
            void 0 === t && (t = {});
            var e = !!t.includeMetadataChanges;
            if (e && this.bf.Wt) throw new j(F$1.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
            return this.Sf && this.Df === e || (this.Sf = 
            /** Calculates the array of DocumentChanges for a given ViewSnapshot. */
            function(t, e) {
                if (t.bf.Ut.T()) {
                    // Special case the first snapshot because index calculation is easy and
                    // fast
                    var n = 0;
                    return t.bf.docChanges.map((function(e) {
                        var r = new ka$1(t.S_, t.D_, e.doc.key, e.doc, new Ka$1(t.bf.Qt.has(e.doc.key), t.bf.fromCache), t.query.x_);
                        return e.doc, {
                            type: "added",
                            doc: r,
                            oldIndex: -1,
                            newIndex: n++
                        };
                    }));
                }
                // A DocumentSet that is updated incrementally as changes are applied to use
                // to lookup the index of a document.
                var r = t.bf.Ut;
                return t.bf.docChanges.filter((function(t) {
                    return e || 3 /* Metadata */ !== t.type;
                })).map((function(e) {
                    var n = new ka$1(t.S_, t.D_, e.doc.key, e.doc, new Ka$1(t.bf.Qt.has(e.doc.key), t.bf.fromCache), t.query.x_), i = -1, o = -1;
                    return 0 /* Added */ !== e.type && (i = r.indexOf(e.doc.key), r = r.delete(e.doc.key)), 
                    1 /* Removed */ !== e.type && (o = (r = r.add(e.doc)).indexOf(e.doc.key)), {
                        type: Oa$1(e.type),
                        doc: n,
                        oldIndex: i,
                        newIndex: o
                    };
                }));
            }(this, e), this.Df = e), this.Sf;
        }, t;
    }();

    /**
     * A `QueryDocumentSnapshot` contains data read from a document in your
     * Firestore database as part of a query. The document is guaranteed to exist
     * and its data can be extracted with `.data()` or `.get(<field>)` to get a
     * specific field.
     *
     * A `QueryDocumentSnapshot` offers the same API surface as a
     * `DocumentSnapshot`. Since query results contain only existing documents, the
     * `exists` property will always be true and `data()` will never return
     * 'undefined'.
     */ function Oa$1(t) {
        switch (t) {
          case 0 /* Added */ :
            return "added";

          case 2 /* Modified */ :
          case 3 /* Metadata */ :
            return "modified";

          case 1 /* Removed */ :
            return "removed";

          default:
            return S$1();
        }
    }

    // TODO(firestoreexp): Add tests for snapshotEqual with different snapshot
    // metadata
    /**
     * Returns true if the provided snapshots are equal.
     *
     * @param left A snapshot to compare.
     * @param right A snapshot to compare.
     * @return true if the snapshots are equal.
     */ function Pa$1(t, e) {
        return t instanceof Sa$1 && e instanceof Sa$1 ? t.S_ === e.S_ && t.C_.isEqual(e.C_) && (null === t.N_ ? null === e.N_ : t.N_.isEqual(e.N_)) && t.x_ === e.x_ : t instanceof Da$1 && e instanceof Da$1 && t.S_ === e.S_ && 
        /**
         * Returns true if the provided queries point to the same collection and apply
         * the same constraints.
         *
         * @param left A `Query` to compare.
         * @param right A Query` to compare.
         * @return true if the references point to the same location in the same
         * Firestore database.
         */
        function(t, e) {
            return t instanceof Bs && e instanceof Bs && t.firestore === e.firestore && Rn(t.M_, e.M_) && t.x_ === e.x_;
        }(t.query, e.query) && t.metadata.isEqual(e.metadata) && t.bf.isEqual(e.bf);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Reads the document referred to by this `DocumentReference`.
     *
     * Note: `getDoc()` attempts to provide up-to-date data when possible by waiting
     * for data from the server, but it may return cached data or fail if you are
     * offline and the server cannot be reached. To specify this behavior, invoke
     * {@link getDocFromCache()} or {@link getDocFromServer()}.
     *
     * @param reference The reference of the document to fetch.
     * @return A Promise resolved with a `DocumentSnapshot` containing the
     * current document contents.
     */ var Va$1 = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).firestore = t, n;
        }
        return __extends(n, e), n.prototype.R_ = function(t) {
            return new ks(t);
        }, n.prototype.P_ = function(t) {
            var e = this.p_(t, this.firestore.v_);
            return new js(this.firestore, /* converter= */ null, e);
        }, n;
    }(Ls);

    /**
     * Reads the document referred to by this `DocumentReference` from cache.
     * Returns an error if the document is not currently cached.
     *
     * @return A Promise resolved with a `DocumentSnapshot` containing the
     * current document contents.
     */ function Ca$1(t, e, n) {
        for (var r = [], i = 3; i < arguments.length; i++) r[i - 3] = arguments[i];
        var o = ws(t.firestore, Na$1), u = Gs(o);
        // For Compat types, we have to "extract" the underlying types before
        // performing validation.
        return e instanceof ds && (e = e.o_), La$1(o, ("string" == typeof e || e instanceof Fs ? Zs(u, "updateDoc", t.C_, e, n, r) : $s(u, "updateDoc", t.C_, e)).L_(t.C_, Ze.exists(!0)));
    }

    /**
     * Deletes the document referred to by the specified `DocumentReference`.
     *
     * @param reference A reference to the document to delete.
     * @return A Promise resolved once the document has been successfully
     * deleted from the backend (note that it won't resolve while you're offline).
     */
    /** Locally writes `mutations` on the async queue. */ function La$1(t, e) {
        return Ia$1(qa$1(t), e);
    }

    /**
     * Converts a ViewSnapshot that contains the single document specified by `ref`
     * to a DocumentSnapshot.
     */ function Ra$1(t, e, n) {
        var r = n.docs.get(e.C_), i = new Va$1(t);
        return new Sa$1(t, i, e.C_, r, new Ka$1(n.hasPendingWrites, n.fromCache), e.x_);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Constant used to indicate the LRU garbage collection should be disabled.
     * Set this value as the `cacheSizeBytes` on the settings passed to the
     * `Firestore` instance.
     */
    /**
     * The persistence provider included with the full Firestore SDK.
     */ var Ma$1 = /** @class */ function() {
        function t() {}
        return t.prototype.enableIndexedDbPersistence = function(t, e) {
            return function(t, e) {
                Aa$1(t);
                var n = qa$1(t), r = t.k_(), i = new ls;
                return xa$1(n, i, new hs(i, r.cacheSizeBytes, null == e ? void 0 : e.forceOwnership));
            }(t.o_, {
                forceOwnership: e
            });
        }, t.prototype.enableMultiTabIndexedDbPersistence = function(t) {
            return function(t) {
                Aa$1(t);
                var e = qa$1(t), n = t.k_(), r = new ls;
                return xa$1(e, r, new fs(r, n.cacheSizeBytes));
            }(t.o_);
        }, t.prototype.clearIndexedDbPersistence = function(t) {
            return function(t) {
                var r = this;
                if (t.mf && !t.Af) throw new j(F$1.FAILED_PRECONDITION, "Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");
                var i = new rr;
                return t.yf.ys((function() {
                    return __awaiter(r, void 0, void 0, (function() {
                        var r;
                        return __generator(this, (function(o) {
                            switch (o.label) {
                              case 0:
                                return o.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , function(t) {
                                    return __awaiter(this, void 0, void 0, (function() {
                                        var e;
                                        return __generator(this, (function(n) {
                                            switch (n.label) {
                                              case 0:
                                                return ur.kn() ? (e = t + "main", [ 4 /*yield*/ , ur.delete(e) ]) : [ 2 /*return*/ , Promise.resolve() ];

                                              case 1:
                                                return n.sent(), [ 2 /*return*/ ];
                                            }
                                        }));
                                    }));
                                }(so(t.v_, t.df)) ];

                              case 1:
                                return o.sent(), i.resolve(), [ 3 /*break*/ , 3 ];

                              case 2:
                                return r = o.sent(), i.reject(r), [ 3 /*break*/ , 3 ];

                              case 3:
                                return [ 2 /*return*/ ];
                            }
                        }));
                    }));
                })), i.promise
                /**
     * Waits until all currently pending writes for the active user have been
     * acknowledged by the backend.
     *
     * The returned Promise resolves immediately if there are no outstanding writes.
     * Otherwise, the Promise waits for all previously issued writes (including
     * those written in a previous app session), but it does not wait for writes
     * that were added after the function is called. If you want to wait for
     * additional writes, call `waitForPendingWrites()` again.
     *
     * Any outstanding `waitForPendingWrites()` Promises are rejected during user
     * changes.
     *
     * @return A Promise which resolves when all currently pending writes have been
     * acknowledged by the backend.
     */;
            }(t.o_);
        }, t;
    }(), Ua$1 = /** @class */ function(r) {
        function i(t, e, n) {
            var i = this;
            return (i = r.call(this, e) || this).Cf = n, i.INTERNAL = {
                delete: function() {
                    return i.terminate();
                }
            }, t instanceof _ || (i.Nf = t), i;
        }
        return __extends(i, r), Object.defineProperty(i.prototype, "v_", {
            get: function() {
                return this.o_.v_;
            },
            enumerable: !1,
            configurable: !0
        }), i.prototype.settings = function(t) {
            t.merge && 
            // Remove the property from the settings once the merge is completed
            delete (t = Object.assign(Object.assign({}, this.o_.gf()), t)).merge, this.o_.Pf(t);
        }, i.prototype.useEmulator = function(t, e) {
            "firestore.googleapis.com" !== this.o_.gf().host && x$1("Host has been set in both settings() and useEmulator(), emulator host will be used"), 
            this.settings({
                host: t + ":" + e,
                ssl: !1,
                merge: !0
            });
        }, i.prototype.enableNetwork = function() {
            return function(t) {
                var r = this;
                return t.rs.enqueue((function() {
                    return __awaiter(r, void 0, void 0, (function() {
                        var e, r;
                        return __generator(this, (function(n) {
                            switch (n.label) {
                              case 0:
                                return [ 4 /*yield*/ , ga(t) ];

                              case 1:
                                return e = n.sent(), [ 4 /*yield*/ , wa(t) ];

                              case 2:
                                return r = n.sent(), [ 2 /*return*/ , (e.da(!0), function(t) {
                                    var e = D$1(t);
                                    return e.Hc.delete(0 /* UserDisabled */), ko(e);
                                }(r)) ];
                            }
                        }));
                    }));
                }));
            }
            /** Disables the network connection. Pending operations will not complete. */ (qa$1(this.o_));
        }, i.prototype.disableNetwork = function() {
            return function(t) {
                var r = this;
                return t.rs.enqueue((function() {
                    return __awaiter(r, void 0, void 0, (function() {
                        var r, i;
                        return __generator(this, (function(o) {
                            switch (o.label) {
                              case 0:
                                return [ 4 /*yield*/ , ga(t) ];

                              case 1:
                                return r = o.sent(), [ 4 /*yield*/ , wa(t) ];

                              case 2:
                                return i = o.sent(), [ 2 /*return*/ , (r.da(!1), function(t) {
                                    return __awaiter(this, void 0, void 0, (function() {
                                        var e;
                                        return __generator(this, (function(n) {
                                            switch (n.label) {
                                              case 0:
                                                return (e = D$1(t)).Hc.add(0 /* UserDisabled */), [ 4 /*yield*/ , Do(e) ];

                                              case 1:
                                                return n.sent(), 
                                                // Set the OnlineState to Offline so get()s return from cache, etc.
                                                e.Zc.set("Offline" /* Offline */), [ 2 /*return*/ ];
                                            }
                                        }));
                                    }));
                                }(i)) ];
                            }
                        }));
                    }));
                }));
            }
            /**
     * Returns a Promise that resolves when all writes that were pending at the time
     * this method was called received server acknowledgement. An acknowledgement
     * can be either acceptance or rejection.
     */ (qa$1(this.o_));
        }, i.prototype.enablePersistence = function(t) {
            var e = !1, n = !1;
            return t && gs("synchronizeTabs", e = !!t.synchronizeTabs, "experimentalForceOwningTab", n = !!t.experimentalForceOwningTab), 
            e ? this.Cf.enableMultiTabIndexedDbPersistence(this) : this.Cf.enableIndexedDbPersistence(this, n);
        }, i.prototype.clearPersistence = function() {
            return this.Cf.clearIndexedDbPersistence(this);
        }, i.prototype.terminate = function() {
            return this.app._removeServiceInstance("firestore"), this.app._removeServiceInstance("firestore-exp"), 
            this.o_._delete();
        }, i.prototype.waitForPendingWrites = function() {
            return function(t) {
                return function(t) {
                    var r = this, i = new rr;
                    return t.rs.fs((function() {
                        return __awaiter(r, void 0, void 0, (function() {
                            var e;
                            return __generator(this, (function(n) {
                                switch (n.label) {
                                  case 0:
                                    return e = Au, [ 4 /*yield*/ , ba$1(t) ];

                                  case 1:
                                    return [ 2 /*return*/ , e.apply(void 0, [ n.sent(), i ]) ];
                                }
                            }));
                        }));
                    })), i.promise;
                }(qa$1(t));
            }(this.o_);
        }, i.prototype.onSnapshotsInSync = function(t) {
            return function(t, r) {
                var i = this, o = qa$1(t), u = Ur(r) ? r : {
                    next: r
                }, s = new ps(u);
                return t.yf.fs((function() {
                    return __awaiter(i, void 0, void 0, (function() {
                        var t;
                        return __generator(this, (function(e) {
                            switch (e.label) {
                              case 0:
                                return t = function(t, e) {
                                    D$1(t).$s.add(e), 
                                    // Immediately fire an initial event, indicating all existing listeners
                                    // are in-sync.
                                    e.next();
                                }, [ 4 /*yield*/ , _a$2(o) ];

                              case 1:
                                return t.apply(void 0, [ e.sent(), s ]), [ 2 /*return*/ ];
                            }
                        }));
                    }));
                })), function() {
                    s.r_(), t.yf.fs((function() {
                        return __awaiter(i, void 0, void 0, (function() {
                            var t;
                            return __generator(this, (function(e) {
                                switch (e.label) {
                                  case 0:
                                    return t = function(t, e) {
                                        D$1(t).$s.delete(e);
                                    }, [ 4 /*yield*/ , _a$2(o) ];

                                  case 1:
                                    return t.apply(void 0, [ e.sent(), s ]), [ 2 /*return*/ ];
                                }
                            }));
                        }));
                    }));
                };
            }(this.o_, t);
        }, Object.defineProperty(i.prototype, "app", {
            get: function() {
                if (!this.Nf) throw new j(F$1.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
                return this.Nf;
            },
            enumerable: !1,
            configurable: !0
        }), i.prototype.collection = function(t) {
            return vs("Firestore.collection", "path", t), qa$1(this.o_), new ec$1(K$1.k(t), this, 
            /* converter= */ null);
        }, i.prototype.doc = function(t) {
            return vs("Firestore.doc", "path", t), qa$1(this.o_), za$1.xf(K$1.k(t), this, 
            /* converter= */ null);
        }, i.prototype.collectionGroup = function(t) {
            if (vs("Firestore.collectionGroup", "collectionId", t), t.indexOf("/") >= 0) throw new j(F$1.INVALID_ARGUMENT, "Invalid collection ID '" + t + "' passed to function Firestore.collectionGroup(). Collection IDs must not contain '/'.");
            return qa$1(this.o_), new $a$1(
            /**
     * Creates a new Query for a collection group query that matches all documents
     * within the provided collection group.
     */
            function(t) {
                return new En(K$1.$(), t);
            }(t), this, 
            /* converter= */ null);
        }, i.prototype.runTransaction = function(t) {
            var r = this;
            return function(t, r) {
                var i = this, o = new rr;
                return t.rs.fs((function() {
                    return __awaiter(i, void 0, void 0, (function() {
                        var e;
                        return __generator(this, (function(n) {
                            switch (n.label) {
                              case 0:
                                return [ 4 /*yield*/ , function(t) {
                                    return ya$1(t).then((function(t) {
                                        return t.Wc;
                                    }));
                                }(t) ];

                              case 1:
                                return e = n.sent(), new fa$1(t.rs, e, r, o).run(), [ 2 /*return*/ ];
                            }
                        }));
                    }));
                })), o.promise;
            }(qa$1(this.o_), (function(e) {
                return t(new ja$1(r, e));
            }));
        }, i.prototype.batch = function() {
            return qa$1(this.o_), new Ba$1(this);
        }, i;
    }(ds);

    /**
     * Compat class for Firestore. Exposes Firestore Legacy API, but delegates
     * to the functional API of firestore-exp.
     */ function qa$1(t) {
        return t.pf || Fa$1(t), t.pf.lf(), t.pf;
    }

    function Fa$1(t) {
        var e = t.k_(), n = function(t, e, n) {
            return new b(t, e, n.host, n.ssl, n.experimentalForceLongPolling, n.experimentalAutoDetectLongPolling);
        }(t.v_, t.df, e);
        t.pf = new la$1(t.Ef, t.yf, n);
    }

    /**
     * A reference to a transaction.
     */ var ja$1 = /** @class */ function() {
        function t(t, e) {
            this.S_ = t, this.Ff = e, this.Of = Gs(this.S_.o_);
        }
        return t.prototype.get = function(t) {
            var e = this, n = nc$1("Transaction.get", t, this.S_), r = new Rs(this.S_);
            return this.Ff.X_([ n.C_ ]).then((function(t) {
                if (!t || 1 !== t.length) return S$1();
                var i = t[0];
                if (i instanceof _n) return new Qa$1(e.S_, new Sa$1(e.S_.o_, r, n.C_, null, new Ka$1(
                /*hasPendingWrites= */ !1, 
                /* fromCache= */ !1), n.x_));
                if (i instanceof bn) return new Qa$1(e.S_, new Sa$1(e.S_.o_, r, n.C_, i, new Ka$1(
                /*hasPendingWrites= */ !1, 
                /* fromCache= */ !1), n.x_));
                throw S$1();
            }));
        }, t.prototype.set = function(t, e, n) {
            var r = nc$1("Transaction.set", t, this.S_);
            n = ys("Transaction.set", n);
            var i = rc$1(r.x_, e, n), o = Xs(this.Of, "Transaction.set", r.C_, i, null !== r.x_, n);
            return this.Ff.set(r.C_, o), this;
        }, t.prototype.update = function(t, e, n) {
            for (var r = [], i = 3; i < arguments.length; i++) r[i - 3] = arguments[i];
            var o, u = nc$1("Transaction.update", t, this.S_);
            // For Compat types, we have to "extract" the underlying types before
            // performing validation.
                    return e instanceof ds && (e = e.o_), o = "string" == typeof e || e instanceof Fs ? Zs(this.Of, "Transaction.update", u.C_, e, n, r) : $s(this.Of, "Transaction.update", u.C_, e), 
            this.Ff.update(u.C_, o), this;
        }, t.prototype.delete = function(t) {
            var e = nc$1("Transaction.delete", t, this.S_);
            return this.Ff.delete(e.C_), this;
        }, t;
    }(), Ba$1 = /** @class */ function() {
        function t(t) {
            this.S_ = t, this.Mf = [], this.kf = !1, this.Of = Gs(this.S_.o_);
        }
        return t.prototype.set = function(t, e, n) {
            this.$f();
            var r = nc$1("WriteBatch.set", t, this.S_);
            n = ys("WriteBatch.set", n);
            var i = rc$1(r.x_, e, n), o = Xs(this.Of, "WriteBatch.set", r.C_, i, null !== r.x_, n);
            return this.Mf = this.Mf.concat(o.L_(r.C_, Ze.Ge())), this;
        }, t.prototype.update = function(t, e, n) {
            for (var r = [], i = 3; i < arguments.length; i++) r[i - 3] = arguments[i];
            this.$f();
            var o, u = nc$1("WriteBatch.update", t, this.S_);
            // For Compat types, we have to "extract" the underlying types before
            // performing validation.
                    return e instanceof ds && (e = e.o_), o = "string" == typeof e || e instanceof Fs ? Zs(this.Of, "WriteBatch.update", u.C_, e, n, r) : $s(this.Of, "WriteBatch.update", u.C_, e), 
            this.Mf = this.Mf.concat(o.L_(u.C_, Ze.exists(!0))), this;
        }, t.prototype.delete = function(t) {
            this.$f();
            var e = nc$1("WriteBatch.delete", t, this.S_);
            return this.Mf = this.Mf.concat(new dn(e.C_, Ze.Ge())), this;
        }, t.prototype.commit = function() {
            return this.$f(), this.kf = !0, this.Mf.length > 0 ? Ia$1(qa$1(this.S_.o_), this.Mf) : Promise.resolve();
        }, t.prototype.$f = function() {
            if (this.kf) throw new j(F$1.FAILED_PRECONDITION, "A write batch can no longer be used after commit() has been called.");
        }, t;
    }(), za$1 = /** @class */ function(i) {
        function o(t, e) {
            var n = this;
            return (n = i.call(this, e) || this).firestore = t, n.D_ = new Rs(t), n;
        }
        return __extends(o, i), o.xf = function(t, e, n) {
            if (t.length % 2 != 0) throw new j(F$1.INVALID_ARGUMENT, "Invalid document reference. Document references must have an even number of segments, but " + t.M() + " has " + t.length);
            return new o(e, new js(e.o_, n, new Y$1(t)));
        }, o.b_ = function(t, e, n) {
            return new o(e, new js(e.o_, n, t));
        }, Object.defineProperty(o.prototype, "id", {
            get: function() {
                return this.o_.id;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(o.prototype, "parent", {
            get: function() {
                return new ec$1(this.o_.O_.S(), this.firestore, this.o_.x_);
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(o.prototype, "path", {
            get: function() {
                return this.o_.path;
            },
            enumerable: !1,
            configurable: !0
        }), o.prototype.collection = function(t) {
            if (vs("DocumentReference.collection", "path", t), !t) throw new j(F$1.INVALID_ARGUMENT, "Must provide a non-empty collection name to collection()");
            var e = K$1.k(t);
            return new ec$1(this.o_.O_.child(e), this.firestore, 
            /* converter= */ null);
        }, o.prototype.isEqual = function(t) {
            return t instanceof ds && (t = t.o_), t instanceof js && (n = t, ((e = this.o_) instanceof js || e instanceof zs) && (n instanceof js || n instanceof zs) && e.firestore === n.firestore && e.path === n.path && e.x_ === n.x_);
            var e, n;
        }, o.prototype.set = function(t, e) {
            e = ys("DocumentReference.set", e);
            try {
                return function(t, e, n) {
                    var r = ws(t.firestore, Na$1), i = rc$1(t.x_, e, n);
                    return La$1(r, Xs(Gs(r), "setDoc", t.C_, i, null !== t.x_, n).L_(t.C_, Ze.Ge()));
                }(this.o_, t, e);
            } catch (t) {
                throw Ga$1(t, "setDoc", "DocumentReference.set");
            }
        }, o.prototype.update = function(t, e) {
            for (var n = [], i = 2; i < arguments.length; i++) n[i - 2] = arguments[i];
            try {
                return 1 === arguments.length ? Ca$1(this.o_, t) : Ca$1.apply(void 0, __spreadArrays([ this.o_, t, e ], n));
            } catch (t) {
                throw Ga$1(t, "updateDoc", "DocumentReference.update");
            }
        }, o.prototype.delete = function() {
            return La$1(ws((t = this.o_).firestore, Na$1), [ new dn(t.C_, Ze.Ge()) ]);
            var t;
        }, o.prototype.onSnapshot = function() {
            for (var t = this, r = [], i = 0; i < arguments.length; i++) r[i] = arguments[i];
            var o = 
            /**
     * Iterates the list of arguments from an `onSnapshot` call and returns the
     * first argument that may be an `SnapshotListenOptions` object. Returns an
     * empty object if none is found.
     */
            function(t) {
                for (var e = 0, n = t; e < n.length; e++) {
                    var r = n[e];
                    if ("object" == typeof r && !Ur(r)) return r;
                }
                return {};
            }(r), u = function(e, n) {
                var r, i, o;
                return {
                    next: function(e) {
                        o.next && o.next(function(e) {
                            return new Qa$1(t.firestore, new Sa$1(t.firestore.o_, t.D_, e.C_, e.N_, e.metadata, t.o_.x_));
                        }(e));
                    },
                    error: null === (r = (o = Ur(e[0]) ? e[0] : Ur(e[1]) ? e[1] : "function" == typeof e[0] ? {
                        next: e[0],
                        error: e[1],
                        complete: e[2]
                    } : {
                        next: e[1],
                        error: e[2],
                        complete: e[3]
                    }).error) || void 0 === r ? void 0 : r.bind(o),
                    complete: null === (i = o.complete) || void 0 === i ? void 0 : i.bind(o)
                };
            }(r);
            return function(t) {
                for (var r, i, o, u = this, s = [], a = 1; a < arguments.length; a++) s[a - 1] = arguments[a];
                var c = {
                    includeMetadataChanges: !1
                }, h = 0;
                "object" != typeof s[h] || Ur(s[h]) || (c = s[h], h++);
                var f, l, p, d = {
                    includeMetadataChanges: c.includeMetadataChanges
                };
                if (Ur(s[h])) {
                    var v = s[h];
                    s[h] = null === (r = v.next) || void 0 === r ? void 0 : r.bind(v), s[h + 1] = null === (i = v.error) || void 0 === i ? void 0 : i.bind(v), 
                    s[h + 2] = null === (o = v.complete) || void 0 === o ? void 0 : o.bind(v);
                }
                if (t instanceof js) l = ws(t.firestore, Na$1), p = Nn(t.C_.path), f = {
                    next: function(e) {
                        s[h] && s[h](Ra$1(l, t, e));
                    },
                    error: s[h + 1],
                    complete: s[h + 2]
                }; else {
                    l = ws(t.firestore, Na$1), p = t.M_;
                    var y = new Va$1(l);
                    f = {
                        next: function(e) {
                            s[h] && s[h](new Da$1(l, y, t, e));
                        },
                        error: s[h + 1],
                        complete: s[h + 2]
                    }, Xa$1(t.M_);
                }
                var g = qa$1(l), m = new ps(f), w = new Ar(p, m, d);
                return l.yf.fs((function() {
                    return __awaiter(u, void 0, void 0, (function() {
                        var t;
                        return __generator(this, (function(e) {
                            switch (e.label) {
                              case 0:
                                return t = Ir, [ 4 /*yield*/ , _a$2(g) ];

                              case 1:
                                return [ 2 /*return*/ , t.apply(void 0, [ e.sent(), w ]) ];
                            }
                        }));
                    }));
                })), function() {
                    m.r_(), l.yf.fs((function() {
                        return __awaiter(u, void 0, void 0, (function() {
                            var t;
                            return __generator(this, (function(e) {
                                switch (e.label) {
                                  case 0:
                                    return t = Er, [ 4 /*yield*/ , _a$2(g) ];

                                  case 1:
                                    return [ 2 /*return*/ , t.apply(void 0, [ e.sent(), w ]) ];
                                }
                            }));
                        }));
                    }));
                };
            }(this.o_, o, u);
        }, o.prototype.get = function(t) {
            var r = this;
            return ("cache" === (null == t ? void 0 : t.source) ? function(t) {
                var r = this, i = ws(t.firestore, Na$1), o = qa$1(i), u = new Va$1(i), s = new rr;
                return i.yf.fs((function() {
                    return __awaiter(r, void 0, void 0, (function() {
                        return __generator(this, (function(e) {
                            switch (e.label) {
                              case 0:
                                return [ 4 /*yield*/ , ma(o) ];

                              case 1:
                                return [ 4 /*yield*/ , Ea$1(e.sent(), t.C_, s) ];

                              case 2:
                                return e.sent(), [ 2 /*return*/ ];
                            }
                        }));
                    }));
                })), s.promise.then((function(e) {
                    return new Sa$1(i, u, t.C_, e, new Ka$1(e instanceof bn && e.Je, 
                    /* fromCache= */ !0), t.x_);
                }));
            }(this.o_) : "server" === (null == t ? void 0 : t.source) ? function(t) {
                var r = this, i = ws(t.firestore, Na$1), o = qa$1(i), u = new rr;
                return i.yf.fs((function() {
                    return __awaiter(r, void 0, void 0, (function() {
                        return __generator(this, (function(e) {
                            switch (e.label) {
                              case 0:
                                return [ 4 /*yield*/ , _a$2(o) ];

                              case 1:
                                return [ 4 /*yield*/ , Ta$1(e.sent(), i.yf, t.C_, {
                                    source: "server"
                                }, u) ];

                              case 2:
                                return e.sent(), [ 2 /*return*/ ];
                            }
                        }));
                    }));
                })), u.promise.then((function(e) {
                    return Ra$1(i, t, e);
                }));
            }(this.o_) : function(t) {
                var r = this, i = ws(t.firestore, Na$1), o = qa$1(i), u = new rr;
                return i.yf.fs((function() {
                    return __awaiter(r, void 0, void 0, (function() {
                        return __generator(this, (function(e) {
                            switch (e.label) {
                              case 0:
                                return [ 4 /*yield*/ , _a$2(o) ];

                              case 1:
                                return [ 4 /*yield*/ , Ta$1(e.sent(), i.yf, t.C_, {
                                    source: "default"
                                }, u) ];

                              case 2:
                                return e.sent(), [ 2 /*return*/ ];
                            }
                        }));
                    }));
                })), u.promise.then((function(e) {
                    return Ra$1(i, t, e);
                }));
            }(this.o_)).then((function(t) {
                return new Qa$1(r.firestore, new Sa$1(r.firestore.o_, r.D_, t.C_, t.N_, t.metadata, r.o_.x_));
            }));
        }, o.prototype.withConverter = function(t) {
            return new o(this.firestore, this.o_.withConverter(t));
        }, o;
    }(ds);

    /**
     * Replaces the function name in an error thrown by the firestore-exp API
     * with the function names used in the classic API.
     */
    function Ga$1(t, e, n) {
        return t.message = t.message.replace(e + "()", n + "()"), t;
    }

    var Ka$1 = /** @class */ function() {
        function t(t, e) {
            this.hasPendingWrites = t, this.fromCache = e
            /**
         * Returns true if this `SnapshotMetadata` is equal to the provided one.
         *
         * @param other The `SnapshotMetadata` to compare against.
         * @return true if this `SnapshotMetadata` is equal to the provided one.
         */;
        }
        return t.prototype.isEqual = function(t) {
            return this.hasPendingWrites === t.hasPendingWrites && this.fromCache === t.fromCache;
        }, t;
    }(), Qa$1 = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, n) || this).S_ = t, r;
        }
        return __extends(n, e), Object.defineProperty(n.prototype, "ref", {
            get: function() {
                return new za$1(this.S_, this.o_.ref);
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "id", {
            get: function() {
                return this.o_.id;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "metadata", {
            get: function() {
                return this.o_.metadata;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "exists", {
            get: function() {
                return this.o_.exists();
            },
            enumerable: !1,
            configurable: !0
        }), n.prototype.data = function(t) {
            return this.o_.data(t);
        }, n.prototype.get = function(t, e) {
            return this.o_.get(t, e);
        }, n.prototype.isEqual = function(t) {
            return Pa$1(this.o_, t.o_);
        }, n;
    }(ds), Wa$1 = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return __extends(n, e), n.prototype.data = function(t) {
            return this.o_.data(t);
        }, n;
    }(Qa$1);

    /**
     * Create a Bound from a query and a document.
     *
     * Note that the Bound will always include the key of the document
     * and so only the provided document will compare equal to the returned
     * position.
     *
     * Will throw if the document does not contain all fields of the order by
     * of the query or if any of the fields in the order by are an uncommitted
     * server timestamp.
     */
    /**
     * Parses the given documentIdValue into a ReferenceValue, throwing
     * appropriate errors if the value is anything other than a DocumentReference
     * or String, or if the string is malformed.
     */
    function Ya$1(t, e, n) {
        if (n instanceof ds && (n = n.o_), "string" == typeof n) {
            if ("" === n) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");
            if (!Dn(e) && -1 !== n.indexOf("/")) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '" + n + "' contains a '/' character.");
            var r = e.path.child(K$1.k(n));
            if (!Y$1.G(r)) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '" + r + "' is not because it has an odd number of segments (" + r.length + ").");
            return Xt(t, new Y$1(r));
        }
        if (n instanceof js) return Xt(t, n.C_);
        throw new j(F$1.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: " + ms(n) + ".");
    }

    /**
     * Validates that the value passed into a disjunctive filter satisfies all
     * array requirements.
     */ function Ha$1(t, e) {
        if (!Array.isArray(t) || 0 === t.length) throw new j(F$1.INVALID_ARGUMENT, "Invalid Query. A non-empty array is required for '" + e.toString() + "' filters.");
        if (t.length > 10) throw new j(F$1.INVALID_ARGUMENT, "Invalid Query. '" + e.toString() + "' filters support a maximum of 10 elements in the value array.");
    }

    function Ja$1(t, e, n) {
        if (!n.isEqual(e)) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '" + e.toString() + "' and so you must also use '" + e.toString() + "' as your first orderBy(), but your first orderBy() is on field '" + n.toString() + "' instead.");
    }

    function Xa$1(t) {
        if (An(t) && 0 === t.rn.length) throw new j(F$1.UNIMPLEMENTED, "limitToLast() queries require specifying at least one orderBy() clause");
    }

    var $a$1 = /** @class */ function() {
        function t(t, e, n) {
            this.M_ = t, this.firestore = e, this.x_ = n, this.Lf = Gs(e.o_), this.D_ = new Rs(e);
        }
        return t.prototype.where = function(e, n, r) {
            var i = oa$1("Query.where", e), o = function(t, e, n, r, i, o, u) {
                var s;
                if (i.B()) {
                    if ("array-contains" /* ARRAY_CONTAINS */ === o || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === o) throw new j(F$1.INVALID_ARGUMENT, "Invalid Query. You can't perform '" + o + "' queries on FieldPath.documentId().");
                    if ("in" /* IN */ === o || "not-in" /* NOT_IN */ === o) {
                        Ha$1(u, o);
                        for (var a = [], c = 0, h = u; c < h.length; c++) {
                            var f = h[c];
                            a.push(Ya$1(r, t, f));
                        }
                        s = {
                            arrayValue: {
                                values: a
                            }
                        };
                    } else s = Ya$1(r, t, u);
                } else "in" /* IN */ !== o && "not-in" /* NOT_IN */ !== o && "array-contains-any" /* ARRAY_CONTAINS_ANY */ !== o || Ha$1(u, o), 
                s = ta$1(n, e, u, 
                /* allowArrays= */ "in" /* IN */ === o || "not-in" /* NOT_IN */ === o);
                var l = jn.create(i, o, s);
                return function(t, e) {
                    if (e.cn()) {
                        var n = kn(t);
                        if (null !== n && !n.isEqual(e.field)) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '" + n.toString() + "' and '" + e.field.toString() + "'");
                        var r = Sn(t);
                        null !== r && Ja$1(0, e.field, r);
                    }
                    var i = function(t, e) {
                        for (var n = 0, r = t.filters; n < r.length; n++) {
                            var i = r[n];
                            if (e.indexOf(i.op) >= 0) return i.op;
                        }
                        return null;
                    }(t, 
                    /**
     * Given an operator, returns the set of operators that cannot be used with it.
     *
     * Operators in a query must adhere to the following set of rules:
     * 1. Only one array operator is allowed.
     * 2. Only one disjunctive operator is allowed.
     * 3. NOT_EQUAL cannot be used with another NOT_EQUAL operator.
     * 4. NOT_IN cannot be used with array, disjunctive, or NOT_EQUAL operators.
     *
     * Array operators: ARRAY_CONTAINS, ARRAY_CONTAINS_ANY
     * Disjunctive operators: IN, ARRAY_CONTAINS_ANY, NOT_IN
     */
                    function(t) {
                        switch (t) {
                          case "!=" /* NOT_EQUAL */ :
                            return [ "!=" /* NOT_EQUAL */ , "not-in" /* NOT_IN */ ];

                          case "array-contains" /* ARRAY_CONTAINS */ :
                            return [ "array-contains" /* ARRAY_CONTAINS */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "not-in" /* NOT_IN */ ];

                          case "in" /* IN */ :
                            return [ "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "in" /* IN */ , "not-in" /* NOT_IN */ ];

                          case "array-contains-any" /* ARRAY_CONTAINS_ANY */ :
                            return [ "array-contains" /* ARRAY_CONTAINS */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "in" /* IN */ , "not-in" /* NOT_IN */ ];

                          case "not-in" /* NOT_IN */ :
                            return [ "array-contains" /* ARRAY_CONTAINS */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "in" /* IN */ , "not-in" /* NOT_IN */ , "!=" /* NOT_EQUAL */ ];

                          default:
                            return [];
                        }
                    }(e.op));
                    if (null !== i) 
                    // Special case when it's a duplicate op to give a slightly clearer error message.
                    throw i === e.op ? new j(F$1.INVALID_ARGUMENT, "Invalid query. You cannot use more than one '" + e.op.toString() + "' filter.") : new j(F$1.INVALID_ARGUMENT, "Invalid query. You cannot use '" + e.op.toString() + "' filters with '" + i.toString() + "' filters.");
                }(t, l), l;
            }(this.M_, "Query.where", this.Lf, this.firestore.v_, i, n, r);
            return new t(function(t, e) {
                var n = t.filters.concat([ e ]);
                return new En(t.path, t.collectionGroup, t.rn.slice(), n, t.limit, t.limitType, t.startAt, t.endAt);
            }(this.M_, o), this.firestore, this.x_);
        }, t.prototype.orderBy = function(e, n) {
            var r;
            if (void 0 === n || "asc" === n) r = "asc" /* ASCENDING */; else {
                if ("desc" !== n) throw new j(F$1.INVALID_ARGUMENT, "Function Query.orderBy() has unknown direction '" + n + "', expected 'asc' or 'desc'.");
                r = "desc" /* DESCENDING */;
            }
            var i = oa$1("Query.orderBy", e), o = function(t, e, n) {
                if (null !== t.startAt) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. You must not call startAt() or startAfter() before calling orderBy().");
                if (null !== t.endAt) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. You must not call endAt() or endBefore() before calling orderBy().");
                var r = new tr(e, n);
                return function(t, e) {
                    if (null === Sn(t)) {
                        // This is the first order by. It must match any inequality.
                        var n = kn(t);
                        null !== n && Ja$1(0, n, e.field);
                    }
                }(t, r), r;
            }(this.M_, i, r);
            return new t(function(t, e) {
                // TODO(dimond): validate that orderBy does not list the same key twice.
                var n = t.rn.concat([ e ]);
                return new En(t.path, t.collectionGroup, n, t.filters.slice(), t.limit, t.limitType, t.startAt, t.endAt);
            }(this.M_, o), this.firestore, this.x_);
        }, t.prototype.limit = function(e) {
            return bs("Query.limit", e), new t(Vn(this.M_, e, "F" /* First */), this.firestore, this.x_);
        }, t.prototype.limitToLast = function(e) {
            return bs("Query.limitToLast", e), new t(Vn(this.M_, e, "L" /* Last */), this.firestore, this.x_);
        }, t.prototype.startAt = function(e) {
            for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
            var i = this.Bf("Query.startAt", e, n, 
            /*before=*/ !0);
            return new t(Cn(this.M_, i), this.firestore, this.x_);
        }, t.prototype.startAfter = function(e) {
            for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
            var i = this.Bf("Query.startAfter", e, n, 
            /*before=*/ !1);
            return new t(Cn(this.M_, i), this.firestore, this.x_);
        }, t.prototype.endBefore = function(e) {
            for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
            var i = this.Bf("Query.endBefore", e, n, 
            /*before=*/ !0);
            return new t(Ln(this.M_, i), this.firestore, this.x_);
        }, t.prototype.endAt = function(e) {
            for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
            var i = this.Bf("Query.endAt", e, n, 
            /*before=*/ !1);
            return new t(Ln(this.M_, i), this.firestore, this.x_);
        }, t.prototype.isEqual = function(e) {
            return e instanceof t && this.firestore === e.firestore && Rn(this.M_, e.M_) && this.x_ === e.x_;
        }, t.prototype.withConverter = function(e) {
            return new t(this.M_, this.firestore, e);
        }, 
        /** Helper function to create a bound from a document or fields */ t.prototype.Bf = function(t, e, n, r) {
            if (e instanceof Qa$1) return function(t, e, n, r, i) {
                if (!r) throw new j(F$1.NOT_FOUND, "Can't use a DocumentSnapshot that doesn't exist for " + n + "().");
                // Because people expect to continue/end a query at the exact document
                // provided, we need to use the implicit sort order rather than the explicit
                // sort order, because it's guaranteed to contain the document key. That way
                // the position becomes unambiguous and the query continues/ends exactly at
                // the provided document. Without the key (by using the explicit sort
                // orders), multiple documents could match the position, yielding duplicate
                // results.
                for (var o = [], u = 0, s = On(t); u < s.length; u++) {
                    var a = s[u];
                    if (a.field.B()) o.push(Xt(e, r.key)); else {
                        var c = r.field(a.field);
                        if (Mt(c)) throw new j(F$1.INVALID_ARGUMENT, 'Invalid query. You are trying to start or end a query using a document for which the field "' + a.field + '" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');
                        if (null === c) {
                            var h = a.field.M();
                            throw new j(F$1.INVALID_ARGUMENT, "Invalid query. You are trying to start or end a query using a document for which the field '" + h + "' (used as the orderBy) does not exist.");
                        }
                        o.push(c);
                    }
                }
                return new Jn(o, i);
            }(this.M_, this.firestore.v_, t, e.o_.N_, r);
            var i = [ e ].concat(n);
            return function(t, e, n, r, i, o) {
                // Use explicit order by's because it has to match the query the user made
                var u = t.rn;
                if (i.length > u.length) throw new j(F$1.INVALID_ARGUMENT, "Too many arguments provided to " + r + "(). The number of arguments must be less than or equal to the number of orderBy() clauses");
                for (var s = [], a = 0; a < i.length; a++) {
                    var c = i[a];
                    if (u[a].field.B()) {
                        if ("string" != typeof c) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. Expected a string for document ID in " + r + "(), but got a " + typeof c);
                        if (!Dn(t) && -1 !== c.indexOf("/")) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to " + r + "() must be a plain document ID, but '" + c + "' contains a slash.");
                        var h = t.path.child(K$1.k(c));
                        if (!Y$1.G(h)) throw new j(F$1.INVALID_ARGUMENT, "Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to " + r + "() must result in a valid document path, but '" + h + "' is not because it contains an odd number of segments.");
                        var f = new Y$1(h);
                        s.push(Xt(e, f));
                    } else {
                        var l = ta$1(n, r, c);
                        s.push(l);
                    }
                }
                return new Jn(s, o);
            }(this.M_, this.firestore.v_, this.Lf, t, i, r);
        }, t.prototype.onSnapshot = function() {
            for (var t, r, i, o = this, u = [], s = 0; s < arguments.length; s++) u[s] = arguments[s];
            var a = {}, c = 0;
            if ("object" != typeof u[c] || Ur(u[c]) || (a = u[c], c++), Ur(u[c])) {
                var h = u[c];
                u[c] = null === (t = h.next) || void 0 === t ? void 0 : t.bind(h), u[c + 1] = null === (r = h.error) || void 0 === r ? void 0 : r.bind(h), 
                u[c + 2] = null === (i = h.complete) || void 0 === i ? void 0 : i.bind(h);
            }
            var f = {
                next: function(t) {
                    u[c] && u[c](new tc$1(o.firestore, new Da$1(o.firestore.o_, o.D_, new Bs(o.firestore.o_, o.x_, o.M_), t)));
                },
                error: u[c + 1],
                complete: u[c + 2]
            };
            return Xa$1(this.M_), function(t, r, i, o) {
                var u = this, s = new ps(o), a = new Ar(r, s, i);
                return t.rs.fs((function() {
                    return __awaiter(u, void 0, void 0, (function() {
                        var e;
                        return __generator(this, (function(n) {
                            switch (n.label) {
                              case 0:
                                return e = Ir, [ 4 /*yield*/ , _a$2(t) ];

                              case 1:
                                return [ 2 /*return*/ , e.apply(void 0, [ n.sent(), a ]) ];
                            }
                        }));
                    }));
                })), function() {
                    s.r_(), t.rs.fs((function() {
                        return __awaiter(u, void 0, void 0, (function() {
                            var e;
                            return __generator(this, (function(n) {
                                switch (n.label) {
                                  case 0:
                                    return e = Er, [ 4 /*yield*/ , _a$2(t) ];

                                  case 1:
                                    return [ 2 /*return*/ , e.apply(void 0, [ n.sent(), a ]) ];
                                }
                            }));
                        }));
                    }));
                };
            }(qa$1(this.firestore.o_), this.M_, a, f);
        }, t.prototype.get = function(t) {
            var r = this;
            Xa$1(this.M_);
            var i = qa$1(this.firestore.o_);
            return (t && "cache" === t.source ? function(t, r) {
                var i = this, o = new rr;
                return t.rs.fs((function() {
                    return __awaiter(i, void 0, void 0, (function() {
                        var i;
                        return __generator(this, (function(u) {
                            switch (u.label) {
                              case 0:
                                return i = function(t, r, i) {
                                    return __awaiter(this, void 0, void 0, (function() {
                                        var e, o, u, s, a, c;
                                        return __generator(this, (function(n) {
                                            switch (n.label) {
                                              case 0:
                                                return n.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , mo(t, r, 
                                                /* usePreviousResults= */ !0) ];

                                              case 1:
                                                return e = n.sent(), o = new du(r, e.Xa), u = o.gh(e.documents), s = o.bi(u, 
                                                /* updateLimboDocuments= */ !1), i.resolve(s.snapshot), [ 3 /*break*/ , 3 ];

                                              case 2:
                                                return a = n.sent(), c = wr(a, "Failed to execute query '" + r + " against cache"), 
                                                i.reject(c), [ 3 /*break*/ , 3 ];

                                              case 3:
                                                return [ 2 /*return*/ ];
                                            }
                                        }));
                                    }));
                                }, [ 4 /*yield*/ , ma(t) ];

                              case 1:
                                return [ 2 /*return*/ , i.apply(void 0, [ u.sent(), r, o ]) ];
                            }
                        }));
                    }));
                })), o.promise;
            }(i, this.M_) : function(t, r, i) {
                var o = this;
                void 0 === i && (i = {});
                var u = new rr;
                return t.rs.fs((function() {
                    return __awaiter(o, void 0, void 0, (function() {
                        var e;
                        return __generator(this, (function(n) {
                            switch (n.label) {
                              case 0:
                                return e = function(t, e, n, r, i) {
                                    var o = new ps({
                                        next: function(n) {
                                            // Remove query first before passing event to user to avoid
                                            // user actions affecting the now stale query.
                                            e.fs((function() {
                                                return Er(t, u);
                                            })), n.fromCache && "server" === r.source ? i.reject(new j(F$1.UNAVAILABLE, 'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')) : i.resolve(n);
                                        },
                                        error: function(t) {
                                            return i.reject(t);
                                        }
                                    }), u = new Ar(n, o, {
                                        includeMetadataChanges: !0,
                                        Hs: !0
                                    });
                                    return Ir(t, u);
                                }, [ 4 /*yield*/ , _a$2(t) ];

                              case 1:
                                return [ 2 /*return*/ , e.apply(void 0, [ n.sent(), t.rs, r, i, u ]) ];
                            }
                        }));
                    }));
                })), u.promise;
            }(i, this.M_, t)).then((function(t) {
                return new tc$1(r.firestore, new Da$1(r.firestore.o_, r.D_, new Bs(r.firestore.o_, r.x_, r.M_), t));
            }));
        }, t;
    }(), Za$1 = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, n) || this).S_ = t, r;
        }
        return __extends(n, e), Object.defineProperty(n.prototype, "type", {
            get: function() {
                return this.o_.type;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "doc", {
            get: function() {
                return new Wa$1(this.S_, this.o_.doc);
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "oldIndex", {
            get: function() {
                return this.o_.oldIndex;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "newIndex", {
            get: function() {
                return this.o_.oldIndex;
            },
            enumerable: !1,
            configurable: !0
        }), n;
    }(ds), tc$1 = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, n) || this).S_ = t, r;
        }
        return __extends(n, e), Object.defineProperty(n.prototype, "query", {
            get: function() {
                return new $a$1(this.o_.query.M_, this.S_, this.o_.query.x_);
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "metadata", {
            get: function() {
                return this.o_.metadata;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "size", {
            get: function() {
                return this.o_.size;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "empty", {
            get: function() {
                return this.o_.empty;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "docs", {
            get: function() {
                var t = this;
                return this.o_.docs.map((function(e) {
                    return new Wa$1(t.S_, e);
                }));
            },
            enumerable: !1,
            configurable: !0
        }), n.prototype.docChanges = function(t) {
            var e = this;
            return this.o_.docChanges(t).map((function(t) {
                return new Za$1(e.S_, t);
            }));
        }, n.prototype.forEach = function(t, e) {
            var n = this;
            this.o_.forEach((function(r) {
                t.call(e, new Wa$1(n.S_, r));
            }));
        }, n.prototype.isEqual = function(t) {
            return Pa$1(this.o_, t.o_);
        }, n;
    }(ds), ec$1 = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            if ((i = e.call(this, Nn(t), n, r) || this).O_ = t, t.length % 2 != 1) throw new j(F$1.INVALID_ARGUMENT, "Invalid collection reference. Collection references must have an odd number of segments, but " + t.M() + " has " + t.length);
            return i;
        }
        return __extends(n, e), Object.defineProperty(n.prototype, "id", {
            get: function() {
                return this.M_.path.C();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "parent", {
            get: function() {
                var t = this.M_.path.S();
                return t.T() ? null : za$1.xf(t, this.firestore, 
                /* converter= */ null);
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "path", {
            get: function() {
                return this.M_.path.M();
            },
            enumerable: !1,
            configurable: !0
        }), n.prototype.doc = function(t) {
            // We allow omission of 'pathString' but explicitly prohibit passing in both
            // 'undefined' and 'null'.
            0 === arguments.length && (t = P$1.u()), vs("CollectionReference.doc", "path", t);
            var e = K$1.k(t);
            return za$1.xf(this.M_.path.child(e), this.firestore, this.x_);
        }, n.prototype.add = function(t) {
            var e = this.x_ ? this.x_.toFirestore(t) : t, n = this.doc();
            // Call set() with the converted value directly to avoid calling toFirestore() a second time.
                    return za$1.b_(n.o_.C_, this.firestore, null).set(e).then((function() {
                return n;
            }));
        }, n.prototype.withConverter = function(t) {
            return new n(this.O_, this.firestore, t);
        }, n;
    }($a$1);

    function nc$1(t, e, n) {
        var r = ws(e, js);
        if (r.firestore !== n.o_) throw new j(F$1.INVALID_ARGUMENT, "Provided document reference is from a different Firestore instance.");
        return r;
    }

    /**
     * Converts custom model object of type T into DocumentData by applying the
     * converter if it exists.
     *
     * This function is used when converting user objects to DocumentData
     * because we want to provide the user with a more specific error message if
     * their set() or fails due to invalid data originating from a toFirestore()
     * call.
     */ function rc$1(t, e, n) {
        // Cast to `any` in order to satisfy the union type constraint on
        // toFirestore().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return t ? n && (n.merge || n.mergeFields) ? t.toFirestore(e, n) : t.toFirestore(e) : e;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // The objects that are a part of this API are exposed to third-parties as
    // compiled javascript so we want to flag our private members with a leading
    // underscore to discourage their use.
    /**
     * A `FieldPath` refers to a field in a document. The path may consist of a
     * single field name (referring to a top-level field in the document), or a list
     * of field names (referring to a nested field in the document).
     */ var ic$1 = /** @class */ function(e) {
        /**
         * Creates a FieldPath from the provided field names. If more than one field
         * name is provided, the path will point to a nested field in a document.
         *
         * @param fieldNames A list of field names.
         */
        function n() {
            for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
            return e.call(this, new (Fs.bind.apply(Fs, __spreadArrays([ void 0 ], t)))) || this;
        }
        return __extends(n, e), n.documentId = function() {
            /**
             * Internal Note: The backend doesn't technically support querying by
             * document ID. Instead it queries by the entire document name (full path
             * included), but in the cases we currently support documentId(), the net
             * effect is the same.
             */
            return new n(W$1.q().M());
        }, n.prototype.isEqual = function(t) {
            return t instanceof ds && (t = t.o_), t instanceof Fs && this.o_.F_.isEqual(t.F_);
        }, n;
    }(ds), oc$1 = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return __extends(n, e), n.serverTimestamp = function() {
            var t = new Ts("serverTimestamp");
            return t.a_ = "FieldValue.serverTimestamp", new n(t);
        }, n.delete = function() {
            var t = new Is("deleteField");
            return t.a_ = "FieldValue.delete", new n(t);
        }, n.arrayUnion = function() {
            for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
            var r = 
            /**
     * Returns a special value that can be used with {@link setDoc()} or {@link
     * updateDoc()} that tells the server to union the given elements with any array
     * value that already exists on the server. Each specified element that doesn't
     * already exist in the array will be added to the end. If the field being
     * modified is not already an array it will be overwritten with an array
     * containing exactly the specified elements.
     *
     * @param elements The elements to union into the array.
     * @return The `FieldValue` sentinel for use in a call to `setDoc()` or
     * `updateDoc()`.
     */
            function() {
                for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
                // NOTE: We don't actually parse the data until it's used in set() or
                // update() since we'd need the Firestore instance to do this.
                            return new Ns("arrayUnion", t);
            }.apply(void 0, t);
            return r.a_ = "FieldValue.arrayUnion", new n(r);
        }, n.arrayRemove = function() {
            for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
            var r = function() {
                for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
                // NOTE: We don't actually parse the data until it's used in set() or
                // update() since we'd need the Firestore instance to do this.
                            return new xs("arrayRemove", t);
            }.apply(void 0, t);
            return r.a_ = "FieldValue.arrayRemove", new n(r);
        }, n.increment = function(t) {
            var e = function(t) {
                return new As("increment", t);
            }(t);
            return e.a_ = "FieldValue.increment", new n(e);
        }, n.prototype.isEqual = function(t) {
            return this.o_.isEqual(t.o_);
        }, n;
    }(ds), uc$1 = {
        Firestore: Ua$1,
        GeoPoint: Ss,
        Timestamp: B,
        Blob: Cs,
        Transaction: ja$1,
        WriteBatch: Ba$1,
        DocumentReference: za$1,
        DocumentSnapshot: Qa$1,
        Query: $a$1,
        QueryDocumentSnapshot: Wa$1,
        QuerySnapshot: tc$1,
        CollectionReference: ec$1,
        FieldPath: ic$1,
        FieldValue: oc$1,
        setLogLevel: function(t) {
            var e;
            e = t, I$1.setLogLevel(e);
        },
        CACHE_SIZE_UNLIMITED: -1
    };

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Configures Firestore as part of the Firebase SDK by calling registerService.
     *
     * @param firebase The FirebaseNamespace to register Firestore with
     * @param firestoreFactory A factory function that returns a new Firestore
     *    instance.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Registers the main Firestore build with the components framework.
     * Persistence can be enabled via `firebase.firestore().enablePersistence()`.
     */
    function sc(t) {
        !function(t, e) {
            t.INTERNAL.registerComponent(new Component("firestore", (function(t) {
                return function(t, e) {
                    return new Ua$1(t, new Na$1(t, e), new Ma$1);
                }(t.getProvider("app").getImmediate(), t.getProvider("auth-internal"));
            }), "PUBLIC" /* PUBLIC */).setServiceProps(Object.assign({}, uc$1)));
        }(t), t.registerVersion("@firebase/firestore", "2.0.2");
    }

    sc(firebase$1);

    var firebaseConfig = {
        apiKey: "AIzaSyDzJr78xXPyMBgLZM6485nj3ULFwbdZi5o",
        authDomain: "sveltesf4.firebaseapp.com",
        databaseURL: "https://sveltesf4.firebaseio.com",
        projectId: "sveltesf4",
        storageBucket: "sveltesf4.appspot.com",
        messagingSenderId: "685304491415",
        appId: "1:685304491415:web:7d406a321ebca0a11328d2"
      };
      // Initialize Firebase
      firebase$1.initializeApp(firebaseConfig);

      const db$1 = firebase$1.firestore();

    /* src/User.svelte generated by Svelte v3.29.7 */
    const file = "src/User.svelte";

    function create_fragment(ctx) {
    	let div;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let button0;
    	let t3;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "Delete";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Update";
    			attr_dev(input0, "type", "text");
    			add_location(input0, file, 16, 1, 256);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file, 17, 1, 303);
    			add_location(button0, file, 18, 1, 349);
    			add_location(button1, file, 19, 1, 396);
    			attr_dev(div, "id", "user");
    			attr_dev(div, "class", "svelte-1pe95dt");
    			add_location(div, file, 15, 0, 239);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			set_input_value(input0, /*user*/ ctx[0].email);
    			append_dev(div, t0);
    			append_dev(div, input1);
    			set_input_value(input1, /*user*/ ctx[0].name);
    			append_dev(div, t1);
    			append_dev(div, button0);
    			append_dev(div, t3);
    			append_dev(div, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(button0, "click", /*deleteUser*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", /*updateUser*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*user*/ 1 && input0.value !== /*user*/ ctx[0].email) {
    				set_input_value(input0, /*user*/ ctx[0].email);
    			}

    			if (dirty & /*user*/ 1 && input1.value !== /*user*/ ctx[0].name) {
    				set_input_value(input1, /*user*/ ctx[0].name);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("User", slots, []);
    	let { id = "" } = $$props;
    	let { user = {} } = $$props;

    	function deleteUser() {
    		db$1.collection("users").doc(id).delete();
    	}

    	function updateUser() {
    		db$1.collection("users").doc(id).update(user);
    	}

    	const writable_props = ["id", "user"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<User> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		user.email = this.value;
    		$$invalidate(0, user);
    	}

    	function input1_input_handler() {
    		user.name = this.value;
    		$$invalidate(0, user);
    	}

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(3, id = $$props.id);
    		if ("user" in $$props) $$invalidate(0, user = $$props.user);
    	};

    	$$self.$capture_state = () => ({ db: db$1, id, user, deleteUser, updateUser });

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(3, id = $$props.id);
    		if ("user" in $$props) $$invalidate(0, user = $$props.user);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [user, deleteUser, updateUser, id, input0_input_handler, input1_input_handler];
    }

    class User extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { id: 3, user: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "User",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get id() {
    		throw new Error("<User>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<User>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get user() {
    		throw new Error("<User>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<User>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Field.svelte generated by Svelte v3.29.7 */
    const file$1 = "src/Field.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let p;
    	let t0;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(/*fieldName*/ ctx[0]);
    			t1 = space();
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(p, "class", "svelte-lne9ia");
    			add_location(p, file$1, 14, 4, 279);
    			add_location(button, file$1, 15, 4, 302);
    			attr_dev(div, "class", "field svelte-lne9ia");
    			add_location(div, file$1, 13, 0, 255);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(div, t1);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*deleteField*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fieldName*/ 1) set_data_dev(t0, /*fieldName*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Field", slots, []);
    	const dispatch = createEventDispatcher();
    	let { fieldName = "" } = $$props;

    	function deleteField(field) {
    		dispatch("delete_field", { fieldName });
    	}

    	const writable_props = ["fieldName"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Field> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("fieldName" in $$props) $$invalidate(0, fieldName = $$props.fieldName);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		fieldName,
    		deleteField
    	});

    	$$self.$inject_state = $$props => {
    		if ("fieldName" in $$props) $$invalidate(0, fieldName = $$props.fieldName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fieldName, deleteField];
    }

    class Field extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { fieldName: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Field",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get fieldName() {
    		throw new Error("<Field>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fieldName(value) {
    		throw new Error("<Field>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var FileSaver_min = createCommonjsModule(function (module, exports) {
    (function(a,b){b();})(commonjsGlobal$1,function(){function b(a,b){return "undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(b,c,d){var e=new XMLHttpRequest;e.open("GET",b),e.responseType="blob",e.onload=function(){a(e.response,c,d);},e.onerror=function(){console.error("could not download file");},e.send();}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send();}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"));}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b);}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof commonjsGlobal$1&&commonjsGlobal$1.global===commonjsGlobal$1?commonjsGlobal$1:void 0,a=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href);},4E4),setTimeout(function(){e(j);},0));}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else {var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i);});}}:function(a,b,d,e){if(e=e||open("","_blank"),e&&(e.document.title=e.document.body.innerText="downloading..."),"string"==typeof a)return c(a,b,d);var g="application/octet-stream"===a.type,h=/constructor/i.test(f.HTMLElement)||f.safari,i=/CriOS\/[\d]+/.test(navigator.userAgent);if((i||g&&h)&&"object"==typeof FileReader){var j=new FileReader;j.onloadend=function(){var a=j.result;a=i?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),e?e.location.href=a:location=a,e=null;},j.readAsDataURL(a);}else {var k=f.URL||f.webkitURL,l=k.createObjectURL(a);e?e.location=l:location.href=l,e=null,setTimeout(function(){k.revokeObjectURL(l);},4E4);}});f.saveAs=a.saveAs=a,(module.exports=a);});


    });

    /* src/Generator.svelte generated by Svelte v3.29.7 */

    const { console: console_1 } = globals;
    const file$2 = "src/Generator.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (241:4) {#each fields as f}
    function create_each_block(ctx) {
    	let field_1;
    	let current;

    	field_1 = new Field({
    			props: { fieldName: /*f*/ ctx[19] },
    			$$inline: true
    		});

    	field_1.$on("delete_field", /*deleteField*/ ctx[7]);

    	const block = {
    		c: function create() {
    			create_component(field_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(field_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const field_1_changes = {};
    			if (dirty & /*fields*/ 1) field_1_changes.fieldName = /*f*/ ctx[19];
    			field_1.$set(field_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(field_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(field_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(field_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(241:4) {#each fields as f}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div0;
    	let h20;
    	let t1;
    	let p0;
    	let t3;
    	let ul2;
    	let li0;
    	let t4;
    	let a0;
    	let t6;
    	let li1;
    	let t7;
    	let a1;
    	let t9;
    	let i0;
    	let t11;
    	let li4;
    	let t12;
    	let i1;
    	let t14;
    	let ul0;
    	let li2;
    	let t16;
    	let li3;
    	let t18;
    	let li5;
    	let t20;
    	let li6;
    	let t21;
    	let a2;
    	let t23;
    	let li7;
    	let t24;
    	let a3;
    	let t26;
    	let t27;
    	let li9;
    	let t28;
    	let i2;
    	let t30;
    	let ul1;
    	let li8;
    	let t32;
    	let li10;
    	let t33;
    	let a4;
    	let t35;
    	let br0;
    	let t36;
    	let div4;
    	let h21;
    	let t38;
    	let p1;
    	let t40;
    	let div1;
    	let form0;
    	let input0;
    	let t41;
    	let button0;
    	let t43;
    	let p2;
    	let t45;
    	let div2;
    	let form1;
    	let input1;
    	let t46;
    	let button1;
    	let t48;
    	let div3;
    	let t49;
    	let br1;
    	let t50;
    	let div5;
    	let h22;
    	let t52;
    	let p3;
    	let t53;
    	let i3;
    	let t55;
    	let t56;
    	let button2;
    	let t57;
    	let t58;
    	let br2;
    	let t59;
    	let button3;
    	let t60;
    	let t61;
    	let br3;
    	let t62;
    	let div6;
    	let h23;
    	let t64;
    	let p4;
    	let t66;
    	let p5;
    	let t67;
    	let t68;
    	let t69;
    	let t70;
    	let t71;
    	let t72;
    	let br4;
    	let t73;
    	let div7;
    	let h24;
    	let t75;
    	let p6;
    	let t77;
    	let p7;
    	let t78;
    	let t79;
    	let t80;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*fields*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Step 0";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "If you don't have a Svelte project already, do the following:";
    			t3 = space();
    			ul2 = element("ul");
    			li0 = element("li");
    			t4 = text("download and install ");
    			a0 = element("a");
    			a0.textContent = "Node.js";
    			t6 = space();
    			li1 = element("li");
    			t7 = text("download and unzip ");
    			a1 = element("a");
    			a1.textContent = "this starter project";
    			t9 = text(" to ");
    			i0 = element("i");
    			i0.textContent = "myFolder";
    			t11 = space();
    			li4 = element("li");
    			t12 = text("open a terminal at ");
    			i1 = element("i");
    			i1.textContent = "myFolder";
    			t14 = text(" and type:\n        ");
    			ul0 = element("ul");
    			li2 = element("li");
    			li2.textContent = "npm install + ENTER";
    			t16 = space();
    			li3 = element("li");
    			li3.textContent = "npm run dev + ENTER";
    			t18 = space();
    			li5 = element("li");
    			li5.textContent = "now open a browser, and go to localhost:5000, and see if it works";
    			t20 = space();
    			li6 = element("li");
    			t21 = text("create a ");
    			a2 = element("a");
    			a2.textContent = "Firebase project";
    			t23 = space();
    			li7 = element("li");
    			t24 = text("add this ");
    			a3 = element("a");
    			a3.textContent = "firestore.js";
    			t26 = text(" file to your src folder, and add your Firebase values to it.");
    			t27 = space();
    			li9 = element("li");
    			t28 = text("again in terminal at ");
    			i2 = element("i");
    			i2.textContent = "myFolder";
    			t30 = text(", type:\n    ");
    			ul1 = element("ul");
    			li8 = element("li");
    			li8.textContent = "npm install firebase";
    			t32 = space();
    			li10 = element("li");
    			t33 = text("for hosting your application, consider ");
    			a4 = element("a");
    			a4.textContent = "Netlify.com";
    			t35 = space();
    			br0 = element("br");
    			t36 = space();
    			div4 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Step 1";
    			t38 = space();
    			p1 = element("p");
    			p1.textContent = "Enter a class name (e.g. User, Student, Animal):";
    			t40 = space();
    			div1 = element("div");
    			form0 = element("form");
    			input0 = element("input");
    			t41 = space();
    			button0 = element("button");
    			button0.textContent = "Save Class name";
    			t43 = space();
    			p2 = element("p");
    			p2.textContent = "Add fields, (e.g. name, e-mail, address):";
    			t45 = space();
    			div2 = element("div");
    			form1 = element("form");
    			input1 = element("input");
    			t46 = space();
    			button1 = element("button");
    			button1.textContent = "Add field";
    			t48 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t49 = space();
    			br1 = element("br");
    			t50 = space();
    			div5 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Step 2";
    			t52 = space();
    			p3 = element("p");
    			t53 = text("Download these 2 files, and move them into the ");
    			i3 = element("i");
    			i3.textContent = "src";
    			t55 = text(" folder of your project");
    			t56 = space();
    			button2 = element("button");
    			t57 = text(/*button1Text*/ ctx[3]);
    			t58 = space();
    			br2 = element("br");
    			t59 = space();
    			button3 = element("button");
    			t60 = text(/*button2Text*/ ctx[4]);
    			t61 = space();
    			br3 = element("br");
    			t62 = space();
    			div6 = element("div");
    			h23 = element("h2");
    			h23.textContent = "Step 3";
    			t64 = space();
    			p4 = element("p");
    			p4.textContent = "Add the following line between <script> </script> tags in your App.svelte file:";
    			t66 = space();
    			p5 = element("p");
    			t67 = text("import ");
    			t68 = text(/*className*/ ctx[2]);
    			t69 = text(" from './");
    			t70 = text(/*className*/ ctx[2]);
    			t71 = text(".svelte'");
    			t72 = space();
    			br4 = element("br");
    			t73 = space();
    			div7 = element("div");
    			h24 = element("h2");
    			h24.textContent = "Step 4";
    			t75 = space();
    			p6 = element("p");
    			p6.textContent = "Add the following line to your App.svelte file (outside the <script> </script> tags) :";
    			t77 = space();
    			p7 = element("p");
    			t78 = text("<");
    			t79 = text(/*className*/ ctx[2]);
    			t80 = text("s/>");
    			add_location(h20, file$2, 199, 4, 4313);
    			add_location(p0, file$2, 200, 4, 4333);
    			attr_dev(a0, "href", "https://nodejs.org/en/download/");
    			add_location(a0, file$2, 202, 29, 4440);
    			add_location(li0, file$2, 202, 4, 4415);
    			attr_dev(a1, "href", "https://www.dropbox.com/s/wbco7n4j835x49x/svelte-app.zip?dl=1");
    			add_location(a1, file$2, 203, 28, 4527);
    			add_location(i0, file$2, 203, 128, 4627);
    			add_location(li1, file$2, 203, 4, 4503);
    			add_location(i1, file$2, 204, 28, 4676);
    			add_location(li2, file$2, 206, 12, 4746);
    			add_location(li3, file$2, 207, 12, 4787);
    			attr_dev(ul0, "class", "sourcecode svelte-e7fcpv");
    			add_location(ul0, file$2, 205, 8, 4710);
    			add_location(li4, file$2, 204, 4, 4652);
    			add_location(li5, file$2, 210, 4, 4844);
    			attr_dev(a2, "href", "https://firebase.google.com/docs/web/setup");
    			add_location(a2, file$2, 211, 17, 4936);
    			add_location(li6, file$2, 211, 4, 4923);
    			attr_dev(a3, "href", "https://www.dropbox.com/s/2afem5lbt5w020y/firestore.js?dl=1");
    			add_location(a3, file$2, 212, 17, 5033);
    			add_location(li7, file$2, 212, 4, 5020);
    			add_location(i2, file$2, 213, 29, 5215);
    			add_location(li8, file$2, 215, 8, 5274);
    			attr_dev(ul1, "class", "sourcecode svelte-e7fcpv");
    			add_location(ul1, file$2, 214, 4, 5242);
    			add_location(li9, file$2, 213, 4, 5190);
    			attr_dev(a4, "href", "https://www.netlify.com/");
    			add_location(a4, file$2, 218, 47, 5371);
    			add_location(li10, file$2, 218, 4, 5328);
    			add_location(ul2, file$2, 201, 4, 4406);
    			attr_dev(div0, "id", "step0");
    			attr_dev(div0, "class", "steps svelte-e7fcpv");
    			add_location(div0, file$2, 198, 0, 4278);
    			add_location(br0, file$2, 221, 0, 5444);
    			add_location(h21, file$2, 223, 4, 5474);
    			add_location(p1, file$2, 224, 4, 5494);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$2, 227, 12, 5647);
    			add_location(button0, file$2, 228, 12, 5702);
    			add_location(form0, file$2, 226, 8, 5586);
    			attr_dev(div1, "id", "nameofclass");
    			add_location(div1, file$2, 225, 4, 5555);
    			add_location(p2, file$2, 231, 4, 5766);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$2, 234, 12, 5903);
    			add_location(button1, file$2, 235, 12, 5954);
    			add_location(form1, file$2, 233, 8, 5848);
    			attr_dev(div2, "id", "addField");
    			add_location(div2, file$2, 232, 4, 5820);
    			attr_dev(div3, "id", "users");
    			add_location(div3, file$2, 239, 4, 6013);
    			attr_dev(div4, "class", "steps svelte-e7fcpv");
    			add_location(div4, file$2, 222, 0, 5450);
    			add_location(br1, file$2, 245, 0, 6148);
    			add_location(h22, file$2, 247, 4, 6178);
    			add_location(i3, file$2, 248, 54, 6248);
    			add_location(p3, file$2, 248, 4, 6198);
    			add_location(button2, file$2, 249, 4, 6290);
    			add_location(br2, file$2, 251, 13, 6360);
    			add_location(button3, file$2, 252, 4, 6370);
    			attr_dev(div5, "class", "steps svelte-e7fcpv");
    			add_location(div5, file$2, 246, 0, 6154);
    			add_location(br3, file$2, 257, 0, 6523);
    			add_location(h23, file$2, 259, 4, 6564);
    			add_location(p4, file$2, 260, 4, 6584);
    			attr_dev(p5, "class", "sourcecode svelte-e7fcpv");
    			add_location(p5, file$2, 261, 4, 6684);
    			attr_dev(div6, "id", "step2");
    			attr_dev(div6, "class", "steps svelte-e7fcpv");
    			add_location(div6, file$2, 258, 0, 6529);
    			add_location(br4, file$2, 263, 0, 6764);
    			add_location(h24, file$2, 265, 4, 6805);
    			add_location(p6, file$2, 266, 4, 6825);
    			attr_dev(p7, "class", "sourcecode svelte-e7fcpv");
    			add_location(p7, file$2, 267, 4, 6932);
    			attr_dev(div7, "id", "step3");
    			attr_dev(div7, "class", "steps svelte-e7fcpv");
    			add_location(div7, file$2, 264, 0, 6770);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h20);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div0, t3);
    			append_dev(div0, ul2);
    			append_dev(ul2, li0);
    			append_dev(li0, t4);
    			append_dev(li0, a0);
    			append_dev(ul2, t6);
    			append_dev(ul2, li1);
    			append_dev(li1, t7);
    			append_dev(li1, a1);
    			append_dev(li1, t9);
    			append_dev(li1, i0);
    			append_dev(ul2, t11);
    			append_dev(ul2, li4);
    			append_dev(li4, t12);
    			append_dev(li4, i1);
    			append_dev(li4, t14);
    			append_dev(li4, ul0);
    			append_dev(ul0, li2);
    			append_dev(ul0, t16);
    			append_dev(ul0, li3);
    			append_dev(ul2, t18);
    			append_dev(ul2, li5);
    			append_dev(ul2, t20);
    			append_dev(ul2, li6);
    			append_dev(li6, t21);
    			append_dev(li6, a2);
    			append_dev(ul2, t23);
    			append_dev(ul2, li7);
    			append_dev(li7, t24);
    			append_dev(li7, a3);
    			append_dev(li7, t26);
    			append_dev(ul2, t27);
    			append_dev(ul2, li9);
    			append_dev(li9, t28);
    			append_dev(li9, i2);
    			append_dev(li9, t30);
    			append_dev(li9, ul1);
    			append_dev(ul1, li8);
    			append_dev(ul2, t32);
    			append_dev(ul2, li10);
    			append_dev(li10, t33);
    			append_dev(li10, a4);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t36, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, h21);
    			append_dev(div4, t38);
    			append_dev(div4, p1);
    			append_dev(div4, t40);
    			append_dev(div4, div1);
    			append_dev(div1, form0);
    			append_dev(form0, input0);
    			set_input_value(input0, /*className*/ ctx[2]);
    			append_dev(form0, t41);
    			append_dev(form0, button0);
    			append_dev(div4, t43);
    			append_dev(div4, p2);
    			append_dev(div4, t45);
    			append_dev(div4, div2);
    			append_dev(div2, form1);
    			append_dev(form1, input1);
    			set_input_value(input1, /*field*/ ctx[1]);
    			append_dev(form1, t46);
    			append_dev(form1, button1);
    			append_dev(div4, t48);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			insert_dev(target, t49, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t50, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, h22);
    			append_dev(div5, t52);
    			append_dev(div5, p3);
    			append_dev(p3, t53);
    			append_dev(p3, i3);
    			append_dev(p3, t55);
    			append_dev(div5, t56);
    			append_dev(div5, button2);
    			append_dev(button2, t57);
    			append_dev(button2, t58);
    			append_dev(div5, br2);
    			append_dev(div5, t59);
    			append_dev(div5, button3);
    			append_dev(button3, t60);
    			insert_dev(target, t61, anchor);
    			insert_dev(target, br3, anchor);
    			insert_dev(target, t62, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, h23);
    			append_dev(div6, t64);
    			append_dev(div6, p4);
    			append_dev(div6, t66);
    			append_dev(div6, p5);
    			append_dev(p5, t67);
    			append_dev(p5, t68);
    			append_dev(p5, t69);
    			append_dev(p5, t70);
    			append_dev(p5, t71);
    			insert_dev(target, t72, anchor);
    			insert_dev(target, br4, anchor);
    			insert_dev(target, t73, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, h24);
    			append_dev(div7, t75);
    			append_dev(div7, p6);
    			append_dev(div7, t77);
    			append_dev(div7, p7);
    			append_dev(p7, t78);
    			append_dev(p7, t79);
    			append_dev(p7, t80);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen_dev(form0, "submit", prevent_default(/*addNameOfClass*/ ctx[5]), false, true, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[11]),
    					listen_dev(form1, "submit", prevent_default(/*addField*/ ctx[6]), false, true, false),
    					listen_dev(button2, "click", /*generateEntityFile*/ ctx[9], false, false, false),
    					listen_dev(button3, "click", /*generateCollectionFile*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*className*/ 4 && input0.value !== /*className*/ ctx[2]) {
    				set_input_value(input0, /*className*/ ctx[2]);
    			}

    			if (dirty & /*field*/ 2 && input1.value !== /*field*/ ctx[1]) {
    				set_input_value(input1, /*field*/ ctx[1]);
    			}

    			if (dirty & /*fields, deleteField*/ 129) {
    				each_value = /*fields*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div3, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*button1Text*/ 8) set_data_dev(t57, /*button1Text*/ ctx[3]);
    			if (!current || dirty & /*button2Text*/ 16) set_data_dev(t60, /*button2Text*/ ctx[4]);
    			if (!current || dirty & /*className*/ 4) set_data_dev(t68, /*className*/ ctx[2]);
    			if (!current || dirty & /*className*/ 4) set_data_dev(t70, /*className*/ ctx[2]);
    			if (!current || dirty & /*className*/ 4) set_data_dev(t79, /*className*/ ctx[2]);
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t35);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t36);
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t49);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t50);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t61);
    			if (detaching) detach_dev(br3);
    			if (detaching) detach_dev(t62);
    			if (detaching) detach_dev(div6);
    			if (detaching) detach_dev(t72);
    			if (detaching) detach_dev(br4);
    			if (detaching) detach_dev(t73);
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function publishFile(content, filename) {
    	var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    	window.saveAs(blob, filename);
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Generator", slots, []);
    	let fields = ["name", "email"];
    	let field = "Name";
    	let className = "Person";
    	let button1Text = "Download file: " + className + ".svelte";
    	let button2Text = "Download file: " + className + "s.svelte";

    	function addNameOfClass() {
    		console.log("saved class " + className);
    		$$invalidate(3, button1Text = "Download file: " + className + ".svelte");
    		$$invalidate(4, button2Text = "Download file: " + className + "s.svelte");
    	}

    	function addField() {
    		fields.push(field);
    		$$invalidate(0, fields);
    		console.log("added field " + field);
    	}

    	function deleteField(field) {
    		console.log("delete a field..." + field.detail.fieldName);
    		let index = -1;

    		for (let i = 0; i < fields.length; i++) {
    			if (fields[i] == field.detail.fieldName) {
    				console.log("found it !! at pos " + i);
    				index = i;
    			}
    		}

    		if (index >= 0) {
    			fields.splice(index, 1);
    			$$invalidate(0, fields);
    		}
    	}

    	function generateCollectionFile() {
    		let classN = className.toLowerCase();

    		let src = `
<script>
import {db} from './firestore.js'
import ${className} from './${className}.svelte'
let ${classN}s = []
${getClassVariables()}

db.collection('${classN}s').onSnapshot(data => {
    ${classN}s = data.docs
})

function add${className}(){
    db.collection('${classN}s').add({${getFieldListAsString()}})
    // Firebase will automatically map to relevant names !!
${getFieldsToResetAfterAddition()}
}
<\/script>

<!-- ###################### -->

<div class="${classN}">
    <form on:submit|preventDefault={add${className}}>
${getInputsForAdd()}\t\t<button>Add</button>
    </form>
</div>


<div>
{#each ${classN}s as ${classN}}
    <${className} id={${classN}.id} ${classN}={${classN}.data()} />
{/each}
</div>

<!-- ###################### -->

<style>
.${classN} form {
    display: grid;
    ${getGridTemplateColumns()}
    grid-gap: 10px;
}
</style>
`;

    		console.log(src);
    		publishFile(src, className + "s.svelte");
    	}

    	function generateEntityFile() {
    		let classN = className.toLowerCase();
    		let inputs = getInputs();

    		let src = `
<script>
import {db} from './firestore.js'
export let id = ''
export let ${classN} = {}

function delete${className}(){
    db.collection('${classN}s').doc(id).delete()
}

function update${className}(){
    db.collection('${classN}s').doc(id).update(${classN})
}

<\/script>

<div class="${classN}">
${inputs}\t<button on:click={delete${className}}>Delete</button>
\t<button on:click={update${className}}>Update</button>
</div>

<!-- ###################### -->

<style>
.${classN} {
    display: grid;
    ${getGridTemplateColumns()}
    grid-gap: 10px;
}
</style>
`;

    		console.log(src);
    		publishFile(src, className + ".svelte");
    	}

    	function getFieldListAsString() {
    		let out = "";

    		for (let i = 0; i < fields.length; i++) {
    			out += fields[i] + ", ";
    		}

    		return out.substring(0, out.length - 2);
    	}

    	function getClassVariables() {
    		let out = "";

    		for (let i = 0; i < fields.length; i++) {
    			out += "let " + fields[i] + " = ''\n";
    		}

    		return out;
    	}

    	function getInputs() {
    		let out = "";

    		for (let i = 0; i < fields.length; i++) {
    			out += "\t<input type=\"text\" bind:value=\"{" + className.toLowerCase() + "." + fields[i] + "}\">\n";
    		}

    		return out;
    	}

    	function getInputsForAdd() {
    		let out = "";

    		for (let i = 0; i < fields.length; i++) {
    			out += "\t\t<input type=\"text\" placeholder=\"" + fields[i] + "\" bind:value={" + fields[i] + "}>\n";
    		}

    		return out;
    	}

    	function getFieldsToResetAfterAddition() {
    		let out = "";

    		for (let i = 0; i < fields.length; i++) {
    			out += "\t" + fields[i] + " = ''\n";
    		}

    		return out;
    	}

    	function getButtons() {
    		let out = "";

    		for (let i = 0; i < fields.length; i++) {
    			out += "<input type=\"text\" bind:value=\"{" + className.toLowerCase() + "." + fields[i] + "}\">\n";
    		}

    		return out;
    	}

    	function getGridTemplateColumns() {
    		let fraction = 12 / fields.length;
    		let out = "grid-template-columns: ";

    		for (let i = 0; i < fields.length; i++) {
    			out += fraction + "fr ";
    		}

    		out += "2fr 2fr;";
    		return out;
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Generator> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		className = this.value;
    		$$invalidate(2, className);
    	}

    	function input1_input_handler() {
    		field = this.value;
    		$$invalidate(1, field);
    	}

    	$$self.$capture_state = () => ({
    		User,
    		Field,
    		saveAs: FileSaver_min.saveAs,
    		fields,
    		field,
    		className,
    		button1Text,
    		button2Text,
    		addNameOfClass,
    		addField,
    		publishFile,
    		deleteField,
    		generateCollectionFile,
    		generateEntityFile,
    		getFieldListAsString,
    		getClassVariables,
    		getInputs,
    		getInputsForAdd,
    		getFieldsToResetAfterAddition,
    		getButtons,
    		getGridTemplateColumns
    	});

    	$$self.$inject_state = $$props => {
    		if ("fields" in $$props) $$invalidate(0, fields = $$props.fields);
    		if ("field" in $$props) $$invalidate(1, field = $$props.field);
    		if ("className" in $$props) $$invalidate(2, className = $$props.className);
    		if ("button1Text" in $$props) $$invalidate(3, button1Text = $$props.button1Text);
    		if ("button2Text" in $$props) $$invalidate(4, button2Text = $$props.button2Text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		fields,
    		field,
    		className,
    		button1Text,
    		button2Text,
    		addNameOfClass,
    		addField,
    		deleteField,
    		generateCollectionFile,
    		generateEntityFile,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Generator extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Generator",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.29.7 */
    const file$3 = "src/App.svelte";

    function create_fragment$3(ctx) {
    	let h2;
    	let t1;
    	let h4;
    	let t3;
    	let generator;
    	let t4;
    	let p0;
    	let t5;
    	let a0;
    	let t7;
    	let t8;
    	let p1;
    	let t9;
    	let a1;
    	let current;
    	generator = new Generator({ $$inline: true });

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Svelte file generator ver. 0.3";
    			t1 = space();
    			h4 = element("h4");
    			h4.textContent = "Will generate full CRUD functionality, using Firebase Cloud Firestore";
    			t3 = space();
    			create_component(generator.$$.fragment);
    			t4 = space();
    			p0 = element("p");
    			t5 = text("Developed by ");
    			a0 = element("a");
    			a0.textContent = "Jon Eikholm";
    			t7 = text(" 2020");
    			t8 = space();
    			p1 = element("p");
    			t9 = text("Inspired by ");
    			a1 = element("a");
    			a1.textContent = "Coders Page";
    			add_location(h2, file$3, 8, 0, 104);
    			add_location(h4, file$3, 9, 0, 144);
    			attr_dev(a0, "href", "mailto: joneikholm@gmail.com");
    			add_location(a0, file$3, 12, 16, 253);
    			add_location(p0, file$3, 12, 0, 237);
    			attr_dev(a1, "href", "https://www.youtube.com/watch?v=Rr2kKjYIYRM");
    			add_location(a1, file$3, 13, 15, 332);
    			add_location(p1, file$3, 13, 0, 317);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h4, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(generator, target, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t5);
    			append_dev(p0, a0);
    			append_dev(p0, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t9);
    			append_dev(p1, a1);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(generator.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(generator.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h4);
    			if (detaching) detach_dev(t3);
    			destroy_component(generator, detaching);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Generator });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    // Node Install issues. Solution:

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
