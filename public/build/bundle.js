
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

    /* src/Field.svelte generated by Svelte v3.29.7 */
    const file = "src/Field.svelte";

    function create_fragment(ctx) {
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
    			add_location(p, file, 14, 4, 279);
    			add_location(button, file, 15, 4, 302);
    			attr_dev(div, "class", "field svelte-lne9ia");
    			add_location(div, file, 13, 0, 255);
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
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
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
    		init(this, options, instance, create_fragment, safe_not_equal, { fieldName: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Field",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get fieldName() {
    		throw new Error("<Field>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fieldName(value) {
    		throw new Error("<Field>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

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
    (function(a,b){b();})(commonjsGlobal,function(){function b(a,b){return "undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(b,c,d){var e=new XMLHttpRequest;e.open("GET",b),e.responseType="blob",e.onload=function(){a(e.response,c,d);},e.onerror=function(){console.error("could not download file");},e.send();}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send();}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"));}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b);}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof commonjsGlobal&&commonjsGlobal.global===commonjsGlobal?commonjsGlobal:void 0,a=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href);},4E4),setTimeout(function(){e(j);},0));}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else {var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i);});}}:function(a,b,d,e){if(e=e||open("","_blank"),e&&(e.document.title=e.document.body.innerText="downloading..."),"string"==typeof a)return c(a,b,d);var g="application/octet-stream"===a.type,h=/constructor/i.test(f.HTMLElement)||f.safari,i=/CriOS\/[\d]+/.test(navigator.userAgent);if((i||g&&h)&&"object"==typeof FileReader){var j=new FileReader;j.onloadend=function(){var a=j.result;a=i?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),e?e.location.href=a:location=a,e=null;},j.readAsDataURL(a);}else {var k=f.URL||f.webkitURL,l=k.createObjectURL(a);e?e.location=l:location.href=l,e=null,setTimeout(function(){k.revokeObjectURL(l);},4E4);}});f.saveAs=a.saveAs=a,(module.exports=a);});


    });

    let generateCollectionFile = (className, sortingCBvalue, fields, saveFileFunc)=>{

        let classN = className.toLowerCase();
        let src = `
<script>
import {db} from './firestore.js'
import ${className} from './${className}.svelte'
let ${classN}s = []
${getClassVariables(fields)}

db.collection('${classN}s').orderBy("${fields[0]}").onSnapshot(data => {
    ${classN}s = data.docs
})

function sortByField(field){
    db.collection('${classN}s').orderBy(field).onSnapshot(data => {
        ${classN}s = data.docs
    })
}

function add${className}(){
    db.collection('${classN}s').add({${getFieldListAsString(fields)}})
    // Firebase will automatically map to relevant names !!
${getFieldsToResetAfterAddition(fields)}
}
<\/script>

<!-- ###################### -->
<h2>${className}s</h2>
<br/>
<div id="addSection">
    <form on:submit|preventDefault={add${className}}>
${getInputsForAdd(fields)}\t\t<button>Add</button>
    </form>
</div>

<div>

${getSortForFields(fields, sortingCBvalue)}
{#each ${classN}s as ${classN}}
    <${className} id={${classN}.id} ${classN}={${classN}.data()} />
{/each}
</div>

<!-- ###################### -->

<style>
#sortSection{
    display: grid;
    ${getGridTemplateColumns(fields)}
    grid-gap: 10px;
}

#addSection form{
    display: grid;
    ${getGridTemplateColumnsAddForm(fields)}
    grid-gap: 10px;
}
</style>
`;
    console.log(src);
    saveFileFunc(src, className+"s.svelte");
    };

    function getClassVariables(fields){
        let out = '';
        for(let i=0; i<fields.length; i++){
            out +=  'let '+ fields[i] +' = \'\'\n';
        }
        return out
    }

    function getFieldListAsString(fields){
        let out = '';
        for(let i=0; i<fields.length; i++){
            out +=  fields[i] + ', ';
        }
        return out.substring(0, out.length - 2);
    }


    function getFieldsToResetAfterAddition(fields){
        let out = '';
        for(let i=0; i<fields.length; i++){
            out +=  '\t'+fields[i] +' = \'\'\n';
        }
        return out
    }

    function getInputsForAdd(fields){
        let out = '';
        for(let i=0; i<fields.length; i++){
            out +=  '\t\t<input type="text" placeholder="'+fields[i]+'" bind:value={'+fields[i]+'}>\n';
        }
        return out
    }

    function getSortForFields(fields, sortingCBvalue){
        if(!sortingCBvalue){ // if user did not select the "sorting" checkbox
            return ''
        }
        let out = '<div id="sortSection">\n';
        for(let i=0; i<fields.length; i++){
            out +=  '\t<a on:click={() => sortByField("'+ fields[i] +'")} href="#" ><h3>' + cap(fields[i]) + '</h3></a>\n';
        }
         for(let i=0; i<2; i++){
            out +=  '\t<div></div>\n';
        }
        out += '</div>';
        return out
    }

    function getGridTemplateColumnsAddForm(fields){
        let fraction = Math.round(14 / fields.length * 10) / 10;  
        let out = 'grid-template-columns: ';
        for(let i=0; i<fields.length; i++){
            out += fraction+'fr ';
        }
        out += '2fr;';
        return out
    }

    function getGridTemplateColumns(fields){
        let fraction = Math.round(12 / fields.length * 10) / 10;  
        let out = 'grid-template-columns: ';
        for(let i=0; i<fields.length; i++){
            out += fraction+'fr ';
        }
        out += '2fr 2fr;';
        return out
    }

    function cap(string){
        return string.charAt(0).toUpperCase() + string.slice(1)
    }

    let generateEntityFile = (className, fields, saveFileFunc) => {
        let classN = className.toLowerCase();
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

<div id="${classN}">
${getInputs(className, fields)}\t<button on:click={delete${className}}>Delete</button>
\t<button on:click={update${className}}>Update</button>
</div>

<!-- ###################### -->

<style>
#${classN} {
    display: grid;
    ${getGridTemplateColumns$1(fields)}
    grid-gap: 10px;
}
</style>
`;
    console.log(src);
    saveFileFunc(src, className+".svelte");
    };



    function getInputs(className, fields){
        let out = '';
        for(let i=0; i<fields.length; i++){
            out +=  '\t<input type="text" bind:value="{'+className.toLowerCase()+'.'+fields[i]+'}">\n';
        }
        return out
    }

    function getGridTemplateColumns$1(fields){
        let fraction = Math.round(12 / fields.length * 10) / 10;  
        let out = 'grid-template-columns: ';
        for(let i=0; i<fields.length; i++){
            out += fraction+'fr ';
        }
        out += '2fr 2fr;';
        return out
    }

    /* src/Generator.svelte generated by Svelte v3.29.7 */

    const { console: console_1 } = globals;
    const file$1 = "src/Generator.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (90:4) {#each fields as f}
    function create_each_block(ctx) {
    	let field_1;
    	let current;

    	field_1 = new Field({
    			props: { fieldName: /*f*/ ctx[14] },
    			$$inline: true
    		});

    	field_1.$on("delete_field", /*deleteField*/ ctx[8]);

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
    			if (dirty & /*fields*/ 1) field_1_changes.fieldName = /*f*/ ctx[14];
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
    		source: "(90:4) {#each fields as f}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
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
    	let div5;
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
    	let div4;
    	let span;
    	let input2;
    	let t52;
    	let br2;
    	let t53;
    	let div6;
    	let h22;
    	let t55;
    	let p3;
    	let t56;
    	let i3;
    	let t58;
    	let t59;
    	let button2;
    	let t60;
    	let t61;
    	let br3;
    	let t62;
    	let button3;
    	let t63;
    	let t64;
    	let br4;
    	let t65;
    	let div7;
    	let h23;
    	let t67;
    	let p4;
    	let t69;
    	let p5;
    	let t70;
    	let t71;
    	let t72;
    	let t73;
    	let t74;
    	let t75;
    	let br5;
    	let t76;
    	let div8;
    	let h24;
    	let t78;
    	let p6;
    	let t80;
    	let p7;
    	let t81;
    	let t82;
    	let t83;
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
    			div5 = element("div");
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
    			div4 = element("div");
    			span = element("span");
    			span.textContent = "Add sorting on each field:   ";
    			input2 = element("input");
    			t52 = space();
    			br2 = element("br");
    			t53 = space();
    			div6 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Step 2";
    			t55 = space();
    			p3 = element("p");
    			t56 = text("Download these 2 files, and move them into the ");
    			i3 = element("i");
    			i3.textContent = "src";
    			t58 = text(" folder of your project");
    			t59 = space();
    			button2 = element("button");
    			t60 = text(/*button1Text*/ ctx[3]);
    			t61 = space();
    			br3 = element("br");
    			t62 = space();
    			button3 = element("button");
    			t63 = text(/*button2Text*/ ctx[4]);
    			t64 = space();
    			br4 = element("br");
    			t65 = space();
    			div7 = element("div");
    			h23 = element("h2");
    			h23.textContent = "Step 3";
    			t67 = space();
    			p4 = element("p");
    			p4.textContent = "Add the following line between <script> </script> tags in your App.svelte file:";
    			t69 = space();
    			p5 = element("p");
    			t70 = text("import ");
    			t71 = text(/*className*/ ctx[2]);
    			t72 = text("s from './");
    			t73 = text(/*className*/ ctx[2]);
    			t74 = text("s.svelte'");
    			t75 = space();
    			br5 = element("br");
    			t76 = space();
    			div8 = element("div");
    			h24 = element("h2");
    			h24.textContent = "Step 4";
    			t78 = space();
    			p6 = element("p");
    			p6.textContent = "Add the following line to your App.svelte file (outside the <script> </script> tags) :";
    			t80 = space();
    			p7 = element("p");
    			t81 = text("<");
    			t82 = text(/*className*/ ctx[2]);
    			t83 = text("s/>");
    			add_location(h20, file$1, 48, 4, 1327);
    			add_location(p0, file$1, 49, 4, 1347);
    			attr_dev(a0, "href", "https://nodejs.org/en/download/");
    			add_location(a0, file$1, 51, 29, 1454);
    			add_location(li0, file$1, 51, 4, 1429);
    			attr_dev(a1, "href", "https://www.dropbox.com/s/wbco7n4j835x49x/svelte-app.zip?dl=1");
    			add_location(a1, file$1, 52, 28, 1541);
    			add_location(i0, file$1, 52, 128, 1641);
    			add_location(li1, file$1, 52, 4, 1517);
    			add_location(i1, file$1, 53, 28, 1690);
    			add_location(li2, file$1, 55, 12, 1760);
    			add_location(li3, file$1, 56, 12, 1801);
    			attr_dev(ul0, "class", "sourcecode svelte-17y07s7");
    			add_location(ul0, file$1, 54, 8, 1724);
    			add_location(li4, file$1, 53, 4, 1666);
    			add_location(li5, file$1, 59, 4, 1858);
    			attr_dev(a2, "href", "https://firebase.google.com/docs/web/setup");
    			add_location(a2, file$1, 60, 17, 1950);
    			add_location(li6, file$1, 60, 4, 1937);
    			attr_dev(a3, "href", "https://www.dropbox.com/s/2afem5lbt5w020y/firestore.js?dl=1");
    			add_location(a3, file$1, 61, 17, 2047);
    			add_location(li7, file$1, 61, 4, 2034);
    			add_location(i2, file$1, 62, 29, 2229);
    			add_location(li8, file$1, 64, 8, 2288);
    			attr_dev(ul1, "class", "sourcecode svelte-17y07s7");
    			add_location(ul1, file$1, 63, 4, 2256);
    			add_location(li9, file$1, 62, 4, 2204);
    			attr_dev(a4, "href", "https://www.netlify.com/");
    			add_location(a4, file$1, 67, 47, 2385);
    			add_location(li10, file$1, 67, 4, 2342);
    			add_location(ul2, file$1, 50, 4, 1420);
    			attr_dev(div0, "id", "step0");
    			attr_dev(div0, "class", "steps svelte-17y07s7");
    			add_location(div0, file$1, 47, 0, 1292);
    			add_location(br0, file$1, 70, 0, 2458);
    			add_location(h21, file$1, 72, 4, 2488);
    			add_location(p1, file$1, 73, 4, 2508);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$1, 76, 12, 2661);
    			add_location(button0, file$1, 77, 12, 2716);
    			add_location(form0, file$1, 75, 8, 2600);
    			attr_dev(div1, "id", "nameofclass");
    			add_location(div1, file$1, 74, 4, 2569);
    			add_location(p2, file$1, 80, 4, 2780);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$1, 83, 12, 2917);
    			add_location(button1, file$1, 84, 12, 2968);
    			add_location(form1, file$1, 82, 8, 2862);
    			attr_dev(div2, "id", "addField");
    			add_location(div2, file$1, 81, 4, 2834);
    			attr_dev(div3, "id", "users");
    			add_location(div3, file$1, 88, 4, 3027);
    			add_location(br1, file$1, 93, 4, 3159);
    			add_location(span, file$1, 95, 8, 3199);
    			attr_dev(input2, "id", "sortingCB");
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-17y07s7");
    			add_location(input2, file$1, 95, 65, 3256);
    			attr_dev(div4, "id", "sortingDIV");
    			attr_dev(div4, "class", "svelte-17y07s7");
    			add_location(div4, file$1, 94, 4, 3169);
    			attr_dev(div5, "class", "steps svelte-17y07s7");
    			add_location(div5, file$1, 71, 0, 2464);
    			add_location(br2, file$1, 98, 0, 3345);
    			add_location(h22, file$1, 100, 4, 3375);
    			add_location(i3, file$1, 101, 54, 3445);
    			add_location(p3, file$1, 101, 4, 3395);
    			add_location(button2, file$1, 102, 4, 3487);
    			add_location(br3, file$1, 104, 13, 3595);
    			add_location(button3, file$1, 105, 4, 3605);
    			attr_dev(div6, "class", "steps svelte-17y07s7");
    			add_location(div6, file$1, 99, 0, 3351);
    			add_location(br4, file$1, 109, 0, 3741);
    			add_location(h23, file$1, 111, 4, 3782);
    			add_location(p4, file$1, 112, 4, 3802);
    			attr_dev(p5, "class", "sourcecode svelte-17y07s7");
    			add_location(p5, file$1, 113, 4, 3902);
    			attr_dev(div7, "id", "step2");
    			attr_dev(div7, "class", "steps svelte-17y07s7");
    			add_location(div7, file$1, 110, 0, 3747);
    			add_location(br5, file$1, 115, 0, 3984);
    			add_location(h24, file$1, 117, 4, 4025);
    			add_location(p6, file$1, 118, 4, 4045);
    			attr_dev(p7, "class", "sourcecode svelte-17y07s7");
    			add_location(p7, file$1, 119, 4, 4152);
    			attr_dev(div8, "id", "step3");
    			attr_dev(div8, "class", "steps svelte-17y07s7");
    			add_location(div8, file$1, 116, 0, 3990);
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
    			insert_dev(target, div5, anchor);
    			append_dev(div5, h21);
    			append_dev(div5, t38);
    			append_dev(div5, p1);
    			append_dev(div5, t40);
    			append_dev(div5, div1);
    			append_dev(div1, form0);
    			append_dev(form0, input0);
    			set_input_value(input0, /*className*/ ctx[2]);
    			append_dev(form0, t41);
    			append_dev(form0, button0);
    			append_dev(div5, t43);
    			append_dev(div5, p2);
    			append_dev(div5, t45);
    			append_dev(div5, div2);
    			append_dev(div2, form1);
    			append_dev(form1, input1);
    			set_input_value(input1, /*field*/ ctx[1]);
    			append_dev(form1, t46);
    			append_dev(form1, button1);
    			append_dev(div5, t48);
    			append_dev(div5, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			append_dev(div5, t49);
    			append_dev(div5, br1);
    			append_dev(div5, t50);
    			append_dev(div5, div4);
    			append_dev(div4, span);
    			append_dev(div4, input2);
    			input2.checked = /*sortingCBvalue*/ ctx[5];
    			insert_dev(target, t52, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, t53, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, h22);
    			append_dev(div6, t55);
    			append_dev(div6, p3);
    			append_dev(p3, t56);
    			append_dev(p3, i3);
    			append_dev(p3, t58);
    			append_dev(div6, t59);
    			append_dev(div6, button2);
    			append_dev(button2, t60);
    			append_dev(button2, t61);
    			append_dev(div6, br3);
    			append_dev(div6, t62);
    			append_dev(div6, button3);
    			append_dev(button3, t63);
    			insert_dev(target, t64, anchor);
    			insert_dev(target, br4, anchor);
    			insert_dev(target, t65, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, h23);
    			append_dev(div7, t67);
    			append_dev(div7, p4);
    			append_dev(div7, t69);
    			append_dev(div7, p5);
    			append_dev(p5, t70);
    			append_dev(p5, t71);
    			append_dev(p5, t72);
    			append_dev(p5, t73);
    			append_dev(p5, t74);
    			insert_dev(target, t75, anchor);
    			insert_dev(target, br5, anchor);
    			insert_dev(target, t76, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, h24);
    			append_dev(div8, t78);
    			append_dev(div8, p6);
    			append_dev(div8, t80);
    			append_dev(div8, p7);
    			append_dev(p7, t81);
    			append_dev(p7, t82);
    			append_dev(p7, t83);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
    					listen_dev(form0, "submit", prevent_default(/*addNameOfClass*/ ctx[6]), false, true, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(form1, "submit", prevent_default(/*addField*/ ctx[7]), false, true, false),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[11]),
    					listen_dev(button2, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(button3, "click", /*click_handler_1*/ ctx[13], false, false, false)
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

    			if (dirty & /*fields, deleteField*/ 257) {
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

    			if (dirty & /*sortingCBvalue*/ 32) {
    				input2.checked = /*sortingCBvalue*/ ctx[5];
    			}

    			if (!current || dirty & /*button1Text*/ 8) set_data_dev(t60, /*button1Text*/ ctx[3]);
    			if (!current || dirty & /*button2Text*/ 16) set_data_dev(t63, /*button2Text*/ ctx[4]);
    			if (!current || dirty & /*className*/ 4) set_data_dev(t71, /*className*/ ctx[2]);
    			if (!current || dirty & /*className*/ 4) set_data_dev(t73, /*className*/ ctx[2]);
    			if (!current || dirty & /*className*/ 4) set_data_dev(t82, /*className*/ ctx[2]);
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
    			if (detaching) detach_dev(div5);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t52);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(t53);
    			if (detaching) detach_dev(div6);
    			if (detaching) detach_dev(t64);
    			if (detaching) detach_dev(br4);
    			if (detaching) detach_dev(t65);
    			if (detaching) detach_dev(div7);
    			if (detaching) detach_dev(t75);
    			if (detaching) detach_dev(br5);
    			if (detaching) detach_dev(t76);
    			if (detaching) detach_dev(div8);
    			mounted = false;
    			run_all(dispose);
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

    function publishFile(content, filename) {
    	var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    	window.saveAs(blob, filename);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Generator", slots, []);
    	let fields = ["name", "email"];
    	let field = "Name";
    	let className = "Person";
    	let button1Text = "Download file: " + className + ".svelte";
    	let button2Text = "Download file: " + className + "s.svelte";
    	let sortingCBvalue = false;

    	function addNameOfClass() {
    		console.log("saved class " + className);
    		$$invalidate(3, button1Text = "Download file: " + className + ".svelte");
    		$$invalidate(4, button2Text = "Download file: " + className + "s.svelte");
    	}

    	function addField() {
    		fields.push(field);
    		$$invalidate(0, fields);
    		console.log("added field " + field);
    		$$invalidate(1, field = "");
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

    	function input2_change_handler() {
    		sortingCBvalue = this.checked;
    		$$invalidate(5, sortingCBvalue);
    	}

    	const click_handler = () => generateEntityFile(className, fields, publishFile);
    	const click_handler_1 = () => generateCollectionFile(className, sortingCBvalue, fields, publishFile);

    	$$self.$capture_state = () => ({
    		Field,
    		saveAs: FileSaver_min.saveAs,
    		generateCollectionFile,
    		generateEntityFile,
    		fields,
    		field,
    		className,
    		button1Text,
    		button2Text,
    		sortingCBvalue,
    		addNameOfClass,
    		addField,
    		deleteField,
    		publishFile
    	});

    	$$self.$inject_state = $$props => {
    		if ("fields" in $$props) $$invalidate(0, fields = $$props.fields);
    		if ("field" in $$props) $$invalidate(1, field = $$props.field);
    		if ("className" in $$props) $$invalidate(2, className = $$props.className);
    		if ("button1Text" in $$props) $$invalidate(3, button1Text = $$props.button1Text);
    		if ("button2Text" in $$props) $$invalidate(4, button2Text = $$props.button2Text);
    		if ("sortingCBvalue" in $$props) $$invalidate(5, sortingCBvalue = $$props.sortingCBvalue);
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
    		sortingCBvalue,
    		addNameOfClass,
    		addField,
    		deleteField,
    		input0_input_handler,
    		input1_input_handler,
    		input2_change_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class Generator extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Generator",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.29.7 */
    const file$2 = "src/App.svelte";

    function create_fragment$2(ctx) {
    	let h2;
    	let t1;
    	let h3;
    	let t2;
    	let a0;
    	let t4;
    	let p0;
    	let t6;
    	let generator;
    	let t7;
    	let p1;
    	let t8;
    	let a1;
    	let t10;
    	let t11;
    	let p2;
    	let t12;
    	let a2;
    	let current;
    	generator = new Generator({ $$inline: true });

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Svelte file generator ver. 0.3";
    			t1 = space();
    			h3 = element("h3");
    			t2 = text("Will generate full CRUD functionality, using Firebase Cloud Firestore. ");
    			a0 = element("a");
    			a0.textContent = "See 7-min video";
    			t4 = space();
    			p0 = element("p");
    			p0.textContent = "This is meant to be a starting point for your web application. And when you need to add to existing projects.";
    			t6 = space();
    			create_component(generator.$$.fragment);
    			t7 = space();
    			p1 = element("p");
    			t8 = text("Developed by ");
    			a1 = element("a");
    			a1.textContent = "Jon Eikholm";
    			t10 = text(" 2020");
    			t11 = space();
    			p2 = element("p");
    			t12 = text("Inspired by ");
    			a2 = element("a");
    			a2.textContent = "Coders Page";
    			add_location(h2, file$2, 8, 0, 110);
    			attr_dev(a0, "href", "https://screencast-o-matic.com/watch/cYXD0oLfJI");
    			add_location(a0, file$2, 9, 75, 225);
    			add_location(h3, file$2, 9, 0, 150);
    			add_location(p0, file$2, 10, 0, 308);
    			attr_dev(a1, "href", "mailto: joneikholm@gmail.com");
    			add_location(a1, file$2, 12, 16, 454);
    			add_location(p1, file$2, 12, 0, 438);
    			attr_dev(a2, "href", "https://www.youtube.com/watch?v=Rr2kKjYIYRM");
    			add_location(a2, file$2, 13, 15, 533);
    			add_location(p2, file$2, 13, 0, 518);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t2);
    			append_dev(h3, a0);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(generator, target, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t8);
    			append_dev(p1, a1);
    			append_dev(p1, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t12);
    			append_dev(p2, a2);
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
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t6);
    			destroy_component(generator, detaching);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(p2);
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

    function instance$2($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
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
