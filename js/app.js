/**
 * app.js
 */
window.addEventListener('load', function() {
    window.app = function() {
        var widgetCounter = 0
          , debug = false

          , $  = function(sel) { if (debug == 'verbose') console.warn("$: sel: " + sel); return document.querySelector(sel);    }
          , $$ = function(sel) { if (debug == 'verbose') console.warn("$$: sel: " + sel); return document.querySelectorAll(sel); }

          , getFromSelect = function(el) {
                if (typeof(el) == 'string') el = $(el);
                return (! el) ? null
                             : (el.selectedIndex == -1) ? null
                                                         : el.options[el.selectedIndex].text;
            }

          , $css = function(el, styles) { // takes an element or selector
                if (! (el && el.style) ) {
                    if (typeof(el) == 'string') el = $(el);
                    if (! el && el.style) throw new Error("$css: element is invalid");
                }

                for (var prop in styles) {
                    el.style[prop] = styles[prop];
                }
            }

          , $cssPos = function(value, as) {
                as = as || 'px'; // em, ex, etc...
                return typeof(value) == 'string' ? value : value + as;
            }

          , dialog = function(title, cb, initData, x, y) {
                initData = initData || '';
                x = x || 230;
                y = y || 70;

                var dlgWindow = document.createElement('div');
                dlgWindow.id = 'dlg-' + title.toLowerCase().replace(/ /g, '');
                dlgWindow.draggable = "true";
                document.body.appendChild(dlgWindow);

                dlgWindow.style.zIndex = ++app.dlgZ;

                dlgWindow.addEventListener('click', function() { this.style.zIndex = ++app.dlgZ; }, false);
                dlgWindow.addEventListener('dragstart', dnd.dragStart, false);
                dlgWindow.addEventListener('dragend',   dnd.dragEnd,   false);

                $css($('#'+dlgWindow.id), {
                    position: 'absolute'
                  , top: $cssPos(y)
                  , left: $cssPos(x)
                  , width: $cssPos(200)
                  , height: $cssPos(160)
                  , backgroundColor: '#ccc'
                  , border: '2px outset #ddd'
                });

                dlgWindow.innerHTML += "<div class='titlebar'>" + title + "</div><div>" +
                                        "<textarea style='position: absolute; top: 2em; bottom: 2em; left: 0px; right: 0px;'>" + initData + "</textarea>" +
                                        "<button class='dlg-cancel' style='position: absolute; bottom: 4px; left: 4px;'>Cancel</button>" +
                                        "<button class='dlg-ok' style='position: absolute; bottom: 4px; right: 4px;'>Ok</button>" +
                                        "</div>"
                ;

                var cancelFunc = function(evt) {
                    cb({result: 'cancel', data: ''});
                    destroy();
                };

                var acceptFunc = function(evt) {
                    var textArea = evt.target.parentNode.firstChild;
                    cb({result: 'ok', data: textArea.value});
                    destroy();
                };

                var destroy = function() {
                    $('.dlg-cancel').removeEventListener('click', cancelFunc);
                    $('.dlg-ok').removeEventListener('click', acceptFunc);
                    document.body.removeChild($('#'+dlgWindow.id));
                };

                $('.dlg-cancel').addEventListener('click', cancelFunc);
                $('.dlg-ok').addEventListener('click', acceptFunc);
            }

          , editors = {
                text: function(cb, initData, x, y) {
                    dialog("Text", function(data) {
                        cb(data);
                    }, initData, x, y);
                }

                //FIXME: refactor: options/checkgroup/radiogroup
              , options: function(cb, initData, x, y) {
                    // convert html string to a document fragment, extract option nodes, convert to plaintext string buffer for the editor
                    var parser = new DOMParser()
                      , doc = parser.parseFromString('<options>' + initData + '</options>', "text/xml")
                      , buf = '';
                    ;

                    for (var i=0; i<doc.firstChild.childNodes.length; i++) {
                        var optionNode = doc.firstChild.childNodes[i].firstChild;

                        if (optionNode) {
                            var optionText = optionNode.textContent || '';
                            buf += optionText + "\n";
                        }
                    }

                    dialog("Options", function(data) {
                        // convert plaintext representation back to object nodes
                        var options = data.data.split(/\n/)
                            buf = ''
                        ;

                        for (var i=0; i<options.length; i++) 
                            buf += '<option>' + options[i] + '</option>';

                        data.data = buf;
                        cb(data);

                    }, buf, x, y);
                }

                //FIXME: refactor: options/checkgroup/radiogroup
              , checkgroup: function(cb, initData, x, y) {
                    // convert html string to a document fragment, extract check nodes, convert to plaintext string buffer for the editor

                    var parser = new DOMParser()
                      , doc = parser.parseFromString('<checks>' + initData + '</checks>', "text/xml")
                      , buf = '';
                    ;

                    for (var i=0; i<doc.firstChild.childNodes.length; i++) {
                        var checkNode = doc.firstChild.childNodes[i].firstChild;

                        if (checkNode) {
                            var checkText = checkNode.textContent || '';
                            buf += checkText + "\n";
                        }
                    }

                    dialog("Checkbox Group", function(data) {
                        // convert plaintext representation back to object nodes
                        var checks = data.data.split(/\n/)
                            buf = ''
                        ;

                        for (var i=0; i<checks.length; i++) 
                            buf += '<input type="checkbox"></input><span>' + checks[i] + '</span><br />';

                        data.data = buf;
                        cb(data);

                    }, buf, x, y);
                }

                //FIXME: refactor: options/checkgroup/radiogroup
              , radiogroup: function(cb, initData, x, y) {
                    // convert html string to a document fragment, extract radio nodes, convert to plaintext string buffer for the editor

                    var parser = new DOMParser()
                      , doc = parser.parseFromString('<radios>' + initData + '</radios>', "text/xml")
                      , buf = '';
                    ;

//console.log(doc);

                    for (var i=0; i<doc.firstChild.childNodes.length; i++) {
                        var radioNode = doc.firstChild.childNodes[i].firstChild;

                        if (radioNode) {
                            var radioText = radioNode.textContent || '';
                            buf += radioText + "\n";
                        }
                    }

                    dialog("Radio Group", function(data) {
                        // convert plaintext representation back to object nodes
//console.log(data);
                        var radios = data.data.split(/\n/)
                            buf = ''
                        ;

                        for (var i=0; i<radios.length; i++) 
                            buf += '<input type="radio"><span>' + radios[i] + '</span><br />';

                        data.data = buf;
                        cb(data);

                    }, buf, x, y);
                }

            }

          , updatePropertiesPane = function() {
                var selectedIndex = $('#ui-widgetId').selectedIndex;
                if (selectedIndex < 0) return;

                var currentWidget = $('#ui-widgetId').options[selectedIndex].textContent.split(/ /)[0];
                if (debug) console.log('update properties pane for widget "' + currentWidget + '"');

                var propPanels = {
                    layout: ['display', 'position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'padding', 'opacity', 'zIndex' ]
                  , background: [ 'backgroundColor', 'backgroundImage' ]
                  , foreground: [ 'font', 'color', 'lineHeight' ]
                  , attributes: [] // see widgetSpecs
                  , events: [ 'click', 'change', 'dblclick', 'mouseover', 'mouseout' ]
                  , advanced: [ 'minWidth', 'minHeight' ] //SGE
                };

                // TODO: Refactor to app or dialog initialization
                // load available panels into select element
                if ($('#ui-panel').options.length < 1) {
                    for (var panel in propPanels) $('#ui-panel').add( new Option(panel), null );

                    $('#ui-panel').addEventListener('change', function() {
                        updatePropertiesPane();
                    });
                }

                var panel = getFromSelect($('#ui-panel'));
                var output = $('#ui-output');
                output.innerHTML = '';

                if (panel == 'events') {
                    for (var p in propPanels[panel]) {
                        var propName = propPanels[panel][p];
                        var propValue = $('#' + currentWidget).firstChild.getAttribute('on'+propName);
                        if (! propValue) propValue = '';
                        
                        if (/native/.test(propValue)) propValue =  '';
                        var target = 'document.querySelector(\'#' + currentWidget + '\').children[0]';
                        
                        var record = '<div class="prop-name">' + propName + '</div>' +
                                     '<input id="prop-'+propName+'" type="text" class="prop-value" value="'+propValue+'" onclick="this.select()" onchange="'+target+'.setAttribute(\'on'+propName+'\', this.value);" />' +
                                     '<br/>'
                        ;

                        output.innerHTML += record + "\n";
                    }

                } else if (panel == 'attributes') {
                    var widgetType
                      , widgetTypeHint = $('#ui-widgetId').options[selectedIndex].textContent.split(/ /)[1].replace(/\[/,'').replace(/\]/,'')
                      , widgets = app.getWidgetSpecs()
                      , subType = (/\|/.test(widgetTypeHint)) ? widgetTypeHint.split(/\|/)[1] : false
                    ;

                    // use hint to guess the widget spec
                    for (var spec in widgets) {
                        if (widgets[spec].hint == widgetTypeHint) { widgetType = spec; break; }
                    }

                    // scan dom widget for hint override ("complex" widgets);
                    var domHint = $('#'+currentWidget).firstChild.getAttribute('data-hint') || false;
                    if (domHint) widgetType = domHint;

                    for (var p in widgets[widgetType].attributes) {
                        var propName = widgets[widgetType].attributes[p];
                        var targetSRC = $('#'+currentWidget).firstChild;
                        var targetCB = 'document.querySelector(\'#' + currentWidget + '\').children[0]';
                        var propValue;

                        if (domHint) {
                            // locate dom node in the current widget, having a data-prop attribute containing propName
                            var nodes = targetSRC.children
                              , node
                            ;

                            for (var i=0; i<nodes.length; i++) {
                                node = nodes[i];

                                var found = false
                                  , dataProp = node.getAttribute('data-prop')
                                ;

                                if (dataProp.match(propName)) { // found, update src and callback targets
                                    found      = true;
                                    targetSRC  = node;
                                    targetCB  += '.children[' + i + ']';
                                    break;
                                }

                                if (! found) targetSRC = targetSRC.firstChild; // not found, use the first child
                            }

                            if (debug) console.log('targetSrc for property','"' + propName + '":',targetSRC);
                        }

                        propValue = (propName == 'innerHTML' || propName == 'label') ? targetSRC.innerHTML : targetSRC.getAttribute(propName);
                        if (! propValue) propValue = '';
                        

                        var record = '<div class="prop-name">' + propName + '</div>';

                        if (propName == 'innerHTML' || propName == 'label') { // data-prop hack for label
                            record += '<input id="prop-' + propName + '" type="text" class="prop-value" value="' + propValue + '" onclick="this.select()" onchange="' + targetCB + '.innerHTML = this.value;" />';
                        } else {                        
                            record += '<input id="prop-' + propName + '" type="text" class="prop-value" value="' + propValue + '" onclick="this.select()" onchange="' + targetCB + '.setAttribute(\'' + propName + '\', this.value);" />';
                        }
                        record += "<br/>\n";

                        output.innerHTML += record;
                    }

                } else {
                    var wS = window.getComputedStyle( $('#' + currentWidget) ); // widget container
                    var cS = window.getComputedStyle( $('#' + currentWidget).children[0] ); // widget proper

                    for (p in propPanels[panel]) {
                        var propName = propPanels[panel][p]
                          , propValue = cS[propName] // poperty from child by default, override to use Container below
                        ;

                        if (cS[propName]) {
                            var target = 'document.querySelector(\'#' + currentWidget + '\')';

                            // FIXME: autogenerate empty object based on list of panels (propPanels array)
                            // adding css properties: must specify new fromContainer entry (even if empty)
                            // properties from the widget container (eg position)  should be set to true here:
                            var fromContainer = {
                                layout: {
                                    position: true
                                  , top: true
                                  , left: true
                                  , right: true
                                  , bottom: true
                                }
                              , background: {}
                              , foreground: {}
                              , advanced: {}
                            //, methods {}
                            };

                            if (propName in fromContainer[panel]) { // throws TypeError if panel doesn't have a key in fromContainer, see FIXME above
                                propValue = wS[propName];

                            } else {
                                target += '.children[0]';
                            }

                            var record = '<div class="prop-name">' + propName + '</div>' +
                                         '<input id="prop-' + propName + '" type="text" class="prop-value" value="' + propValue + '" onclick="this.select()" onchange="' + target + '.style.' + propName + '=\'\'+this.value;" />' +
                                         '<br/>'
                            ;

                            output.innerHTML += record + "\n";
                        }
                    }
                }// end panels
            }

          , focusWidget = function(widget) {
                //FIXME: these shouldn't be focusable (dialog dnd hack)
                if (widget.id == 'dlg-canvas') return;
                if (widget.classList.contains('palette')) return;

                var widgets = $$('.widget');
                [].forEach.call(widgets, function(widget) {
                    widget.classList.remove('selected');
                });
                widget.classList.add('selected');

                //FIXME: old method, use data- props
                var widgetToSelect = 0;
                for (var i=0; i < $('#ui-widgetId').options.length; i++) {
                    var label = $('#ui-widgetId').options[i].textContent.split(/ /)[0];
                    if (label == widget.id) {
                        widgetToSelect = i;
                        break;
                    }
                }
                
                $('#ui-widgetId').selectedIndex = widgetToSelect;
                updatePropertiesPane();
            }

          , makeWidget = function(opt) {
                opt = opt || {};

                var element
                  , x = opt.x || 0
                  , y = opt.y || 0
                  , w = opt.w || 'auto'
                  , h = opt.h || 'auto'
                  , action = opt.dropData.split(/\|/)[0]
                  , targetType = opt.dropData.split(/\|/)[1]
                  , srcId = opt.dropData.split(/\|/)[2]
                ;

                element = document.createElement('div');
                element.id = "widget_" + (++widgetCounter);
                element.draggable = "true";
                element.className = "widget";

                $css(element, {
                    display: 'inline-block'
                  , position: 'absolute'
                  , top:    $cssPos(y)
                  , left:   $cssPos(x)
                  , width:  'auto'
                  , height: 'auto'
                });

                var widgetSpecs = app.getWidgetSpecs()
                    widgetSpec  = widgetSpecs[targetType.toLowerCase()]
                ;

                if (widgetSpec && widgetSpec.innerHTML) element.innerHTML = widgetSpec.innerHTML;

                element.innerHTML += '<div class="handle"></div>';

                element.addEventListener('dragstart', dnd.dragStart,    false);
                element.addEventListener('dragend',   dnd.dragEnd,      false);
                element.addEventListener('click',     dnd.selectWidget, false);

                // setup editor
                element.lastChild.addEventListener('dblclick', function() {
                    var selectedIndex = $('#ui-widgetId').selectedIndex
                      , widgetTypeHint = $('#ui-widgetId').options[selectedIndex].textContent.split(/ /)[1].replace(/\[/,'').replace(/\]/,'') //FIXME: old method, use data- props
                      , widgetType = ''
                      , widgets = app.getWidgetSpecs() //FIXME: should be called widgetSpecs
                      , targetId = element.id
                      , currentWidget = $('#'+targetId);
                    ;

                    for (var spec in widgets) {
                        if (widgets[spec].hint == widgetTypeHint) { widgetType = spec; break; }
                    }

                    // override with dom hints
                    var domHint = currentWidget.firstChild.getAttribute('data-hint');
                    if (domHint) widgetType = domHint;

                    var editor = widgets[widgetType].editor
                      , targetProp = widgets[widgetType].edits
                      , complex = widgets[widgetType].complex
                      , targetSRC = $('#'+targetId).firstChild
                      , targetCB = $('#'+targetId).firstChild
                    ;

                    if (complex) {
                        // locate dom node in the current widget, having a data-prop attribute containing targetProp
                        var nodes = targetSRC.children
                          , node
                        ;

                        for (var i=0; i<nodes.length; i++) {
                            node = nodes[i];
                            var found = false
                              , dataProp = node.getAttribute('data-prop')
                            ;

                            if (dataProp.match(targetProp)) { // found, update src and callback targets
                                found      = true;
                                targetSRC  = node;
                                targetCB  = targetCB.children[i];
                                break;
                            }

                            if (! found) targetSRC = targetSRC.firstChild; // not found, use the first child
                        }

                        if (debug) console.log('targetSrc for property','"' + targetProp + '":',targetSRC);
                    }

                    var initData = (targetProp == 'innerHTML' || targetProp == 'label') ? targetSRC.innerHTML : targetSRC.getAttribute(targetProp) // SGE1

                    editor.call(this, function(data) {
                        if (data && data.result.toLowerCase() == 'ok') {
                            if (targetProp == 'innerHTML' || targetProp == 'label') {
                                targetCB.innerHTML = data.data;
                            } else {
                                targetCB.setAttribute(targetProp, data.data);
                            }

                        } else {
                            if (data && data.result.toLowerCase() == 'cancel') {
                                // user canceled the dialog, don't worry about it
                            } else {
                                console.warn("Got unexpected result from dialog():");
                                console.dir(data);
                            }
                        }
                    }, initData, parseInt(getComputedStyle($('#'+targetId)).left), parseInt(getComputedStyle($('#'+targetId)).top)); // pass initData and widget x,y along with callback
                });

                focusWidget(element);
                return element;
            }

          , dnd = { //FIXME: refactor: need dnd objects for dialogs and drag-select
                dragStart: function(evt) {
                    if (debug) console.log('DRAGSTART');
                    if(! evt.target.classList.contains('palette-button')) this.style.opacity = 0.3;

                    // drop data format: [create|move]:widgetType:srcId
                    var evtData
                      , prefix = (evt.target.className.match(/palette-button/)) ? "create" : "move"
                      , targetTypeHint = (evt.target.classList.contains('titlebar')) ? evt.target.parentNode.id : evt.target.innerHTML
                      , targetType = ''
                      , targetId = (evt.target.classList.contains('titlebar')) ? evt.target.parentNode.id : evt.target.id
                      , widgetSpecs = app.getWidgetSpecs()
                    ;

                    for (var spec in widgetSpecs) {
                        if (widgetSpecs[spec].label == targetTypeHint) { targetType = spec; break; }
                    }

                    if (targetType == '') targetType = 'dialog';

                    evt.dataTransfer.effectAllowed = 'move';
                    var dragIcon = document.createElement('img');
                    dragIcon.src = 'img/blank.gif';
                    dragIcon.width = 1;
                    dragIcon.height = 1;
                    evt.dataTransfer.setDragImage(dragIcon, -10, -10);

                    evtData = prefix + "|" + targetType + "|" + targetId
                    if (debug) console.log('starting drag with data:', evtData);
                    evt.dataTransfer.setData('text/plain', evtData);

                    if (evt.target.classList.contains('widget')) focusWidget(evt.target);
                }

              , dragEnd: function(evt) {
                    if (debug) console.log('DRAGEND');
                    this.style.opacity = 1;

                    // handle dialog movement
                    if (evt.target.draggable && /dlg-/.test(evt.target.id)) {
                        var dialog = evt.target
                          , x = evt.pageX
                          , y = evt.pageY
                          , w = parseInt(getComputedStyle(evt.target).width)
                          , h = parseInt(getComputedStyle(evt.target).height)
                        ;

                        x -= Math.floor(w/2); // center the dialog on the mouse
//                        y -= Math.floor(h/2);

                        dialog.style.top = $cssPos(y);
                        dialog.style.left = $cssPos(x);

                        evt.target.style.zIndex = ++app.dlgZ;
                    }
                }

              , selectWidget: function(evt) {
                    if (debug) console.log('SELECTWIDGET');
                    focusWidget(evt.target.parentNode);
                }

              , dragEnter: function(evt) {
                    if (debug) console.log('DRAGENTER');
                }

              , dragOver: function(evt) {
                    if (debug) console.log('DRAGOVER');
                    if (evt.stopPropagation) evt.stopPropagation();
                    if (evt.preventDefault) evt.preventDefault();
                    evt.dataTransfer.dropEffect = 'move';
                    return false;
                }

              , dragLeave: function(evt) {
                    if (debug) console.log('DRAGLEAVE');
                }

              , drop: function(evt) {
                    if (debug) console.log('DROP');
                    if (evt.stopPropagation) evt.stopPropagation();

                    var calculatePosition = function(widget) {
                        var w = parseInt(window.getComputedStyle(widget).width)
                          , h = parseInt(window.getComputedStyle(widget).height)
                          , destX = parseInt(evt.offsetX)-parseInt(w/2)
                          , destY = parseInt(evt.offsetY)-parseInt(h/2)
                        ;

                        return { x: destX, y: destY };
                    }

                    var content = evt.dataTransfer.getData('text/plain');
                    if (/dlg-/.test( content.split(/\|/)[2] )) { return; }// handle widgets here, generic moves (eg dialogs) in dragEnd

                    var action = content.split(/\|/)[0]
                      , targetType = content.split(/\|/)[1]
                      , srcId = content.split(/\|/)[2]
                      , widget = action == 'create' ? makeWidget({ dropData: content, x: evt.offsetX, y: evt.offsetY }) : $('#'+srcId)
                      , position = calculatePosition(widget)
                    ;

                    if (debug) console.log('DROP DATA:', typeof(content), content);
                    
                    if (action == 'create') {
                        // place the new widget and recalculate position
                        $('.container').appendChild(widget);
                        position = calculatePosition(widget);

                        $css(widget, {
                            top: $cssPos(position.y)
                          , left: $cssPos(position.x)
                        });

                        // update properties area, check for subtypes of input elements
                        var hint = widget.children[0].tagName.toLowerCase()
                          , subType = (hint == 'input' && targetType != 'input') ? targetType : false;
                        ;

                        if (subType) hint += '|' + subType;

                        // override with dom hints
                        var domHint = widget.firstChild.getAttribute('data-hint');
                        if (domHint) hint = domHint;

                        $('#ui-widgetId').add( new Option(widget.id + " [" + hint + "]"), null );
                        $('#ui-widgetId').selectedIndex = $('#ui-widgetId').options.length-1;
                        updatePropertiesPane();

                        if (debug) console.log('created widget', widget);

                    } else {
                        // move the widget
                        $css(widget, {
                            top: $cssPos(position.y)
                          , left: $cssPos(position.x)
                        });

                        if (debug) console.log('moved widget', widget);
                    }
                }
            }
        ;

        return {
            dlgZ: 100000 //FIXME: should not be public

          , main: function(opts) { //FIXME: should be private
                debug = opts && opts.debug || false;

                // setup tool palette
                var widgetSpecs = app.getWidgetSpecs()
                  , palettePanel = $('.palette')
                ;

                for (var widgetType in widgetSpecs) {
                    var className = 'palette-button';
                    if (widgetSpecs[widgetType].complex == true) className += ' complex';
                    palettePanel.innerHTML += "<button draggable='true' class='" + className + "'>" + widgetSpecs[widgetType].label + "</button>";
                }

                var dialogs = $$('.titlebar');
                [].forEach.call(dialogs, function(dlgWindow) {
                    dlgWindow.parentNode.addEventListener('click', function() { this.style.zIndex = ++app.dlgZ; }, false);
                    dlgWindow.parentNode.addEventListener('dragstart', dnd.dragStart, false);
                    dlgWindow.parentNode.addEventListener('dragend',   dnd.dragEnd,   false);
                });

                // setup widget dnd
                var widgets    = $$('.palette-button')
                  , containers = $$('.container')
                ;

                [].forEach.call(widgets, function(widget) {
                    if (debug) console.log('setting up widget', widget);
                    widget.addEventListener('dragstart', dnd.dragStart,    false);
                    widget.addEventListener('dragend',   dnd.dragEnd,      false);
                    widget.addEventListener('click',     dnd.selectWidget, false);
                });

                [].forEach.call(containers, function(container) {
                    if (debug) console.log('setting up container', container);
                    container.addEventListener('dragenter', dnd.dragEnter, false);
                    container.addEventListener('dragover',  dnd.dragOver,  false);
                    container.addEventListener('dragleave', dnd.dragLeave, false);
                    container.addEventListener('drop',      dnd.drop,      false);
                });

                $('#ui-widgetId').addEventListener('change', function(evt) {
                    var selectedIndex = this.selectedIndex
                      , label = this.options[selectedIndex].textContent.split(/ /)[0]
                    ;

                    focusWidget($('#'+label));
                });
            },

            menu: { // FIXME: create a menu widget
                file: function() {
                    var menu = $('#fileMenu');
                    if (menu.selectedIndex == 0) return;

                    switch( getFromSelect('#fileMenu').toLowerCase() ) {
                        case 'file':
                            break;

                        case 'new':
                            var canvasEl   = $('#dlg-canvas'),
                                widgetIdEl = $('#ui-widgetId')
                            ;

                            if ( confirm("Delete existing page?") ) {
                                while (canvasEl.children.length > 0) {
                                    canvasEl.removeChild(canvasEl.firstChild);
                                    widgetIdEl.remove(0);
                                }
                            }

                            app.updateStatus("New page created");
                            break;

                        case 'save':
                            var el = $('#dlg-canvas')
//                              , content = new XMLSerializer().serializeToString(el)
                                , content = el.innerHTML
                            ;

                            app.updateStatus("Save Stub");
                            console.log('<!doctype html><html lang="en"><head><title></title></head><body>'+content+'</body></html>');
                            break;

                        case 'load':
                            app.updateStatus("Load Stub");
                            break;

                        default:
                            app.updateStatus('Unknown file command');
                    }

                    menu.selectedIndex = 0;
                    menu.blur();
                }

              , view: function() {
                    var menu = $('#viewMenu');
                    if (menu.selectedIndex == 0) return;

                    switch( getFromSelect('#viewMenu').toLowerCase() ) {
                        case "view":
                            break;

                        case "grid":
                            var bgi = getComputedStyle( $('#dlg-canvas') )['background-image'];

                            if (bgi != 'none') {
                                app.backgroundImage = bgi;

                                $('#dlg-canvas').style.backgroundImage = 'none';
                                $('#dlg-canvas').style.background = 'transparent';

                            } else {
                                $('#dlg-canvas').style.background = 'none';
                                $('#dlg-canvas').style.backgroundImage = app.backgroundImage;
                            }
                            break;

                        case 'preview':
                            var canvasStyle = getComputedStyle($('#dlg-canvas'))
                              , y = Math.floor(screen.availHeight/16)
                              , x = Math.floor(screen.availWidth/16)
                              , h = Math.floor(screen.availHeight/1.25)
                              , w = Math.floor(screen.availWidth/1.25)
                            ;

                            var previewWindow = window.open('about:blank','preivewWindow','top='+y+',left='+x+',height='+h+',width='+w+',menubar=yes,status=yes,resizable=yes');
                            previewWindow.document.write( $('#dlg-canvas').innerHTML );
                            break;

                        default:
                            app.updateStatus('Unknown view command');
                    }

                    menu.selectedIndex = 0;
                    menu.blur();
                }

              , tools: function() {
                    var menu = $('#toolsMenu');
                    if (menu.selectedIndex == 0) return;

                    switch( getFromSelect('#toolsMenu').toLowerCase() ) {
                        case "tools":
                            break;

                        case "debug":
                            var toggleTo = debug ? false : 'verbose',
                                toState  = debug ? 'off' : 'on'
                            ;

                            app.debugging(toggleTo);
                            app.updateStatus('Debugging ' + toState);
                            
                            break;

                        case "verbose":
                            var toggleTo = debug ? false : true,
                                toState  = debug ? 'off' : 'on'
                            ;

                            app.debugging(toggleTo);
                            app.updateStatus('Verbose debugging ' + toState);
                            
                            break;

                        default:
                            app.updateStatus('Unknown tools command');
                    }

                    menu.selectedIndex = 0;
                    menu.blur();
                }

              , help: function() {
                    var menu = $('#helpMenu');
                    if (menu.selectedIndex == 0) return;

                    switch( getFromSelect('#helpMenu').toLowerCase() ) {
                        case "help":
                            break;

                        case "about":
                            dialog("About", function(data) {
                                if (debug) console.log(data);
                            }, "About Here", 100, 100);
                            break;

                        default:
                            app.updateStatus('Unknown help command');
                    }

                    menu.selectedIndex = 0;
                    menu.blur();
                }
            },

            updateStatus: function(msg) { //FIXME: should be private
                $('#dlg-status').innerHTML = msg;
                setTimeout(function() { $('#dlg-status').innerHTML = ''; }, 2500);
            },

            debugging: function(flag) { //FIXME: should be private
                debug = flag;
                if (debug) {
                    window.$ = $;
                    window.$$ = $$;

                } else {
                    window.$ = function(){};
                    window.$$ = function(){};
                }
            },

            getWidgetSpecs: function() {
                return {
                    button: {
                        label: 'Button'
                      , hint: 'button'
                      , attributes: ['innerHTML']
                      , editor: editors.text
                      , edits: 'innerHTML'
                      , complex: false
                      , innerHTML: '<button>Button</button>'
                    }

                  , input: {
                        label: 'Textbox'
                      , hint: 'input'
                      , attributes: ['type', 'value']
                      , editor: editors.text
                      , edits: 'value'
                      , complex: false
                      , innerHTML: '<input type="text" value="" />'
                    }

                  , select: {
                        label: 'Select'
                      , hint: 'select'
                      , attributes: ['innerHTML']
                      , editor: editors.options
                      , edits: 'innerHTML'
                      , complex: false
                      , innerHTML: '<select><option>Select an option...</option></select>'
                    }

                  , span: {
                        label: 'Label'
                      , hint: 'span'
                      , attributes: ['innerHTML']
                      , editor: editors.text
                      , edits: 'innerHTML'
                      , complex: false
                      , innerHTML: '<span>Lorem Ipsum and all that jazz.</span>'
                    }

                  , image: {    
                        label: 'Image'
                      , hint: 'img'
                      , attributes: ['src', 'width', 'height']
                      , editor: editors.text
                      , edits: 'src'
                      , complex: false
                      , innerHTML: '<img src="" border="0" title="" alt="" width="32" height="32" />'
                    }

                  , panel: {
                        label: 'Panel'
                      , hint: 'div'
                      , attributes: ['innerHTML']
                      , editor: editors.text
                      , edits: 'innerHTML'
                      , complex: false
                      , innerHTML: '<div></div>'
                    }

                  , checkbox: {
                        label: 'Checkbox'
                      , hint: 'input|checkbox'
                      , attributes: ['type', 'checked', 'label']
                      , editor: editors.text
                      , edits: 'label'
                      , complex: true
                      , innerHTML: '<div data-hint="checkbox"><input type="checkbox" data-prop="type|checked" /><span data-prop="label"></span></div>'
                    }

                  , radio: {
                        label: 'Radio Button'
                      , hint: 'input|radio'
                      , attributes: ['type', 'checked', 'label']
                      , editor: editors.text
                      , edits: 'label'
                      , complex: true
                      , innerHTML: '<div data-hint="radio"><input type="radio" data-prop="type|checked" /><span data-prop="label"></span></div>'
                    }

                  , checkgroup: {
                        label: 'Checkbox Group'
                      , hint: 'input|checkgroup'
                      , attributes: ['label']
                      , editor: editors.checkgroup
                      , edits: 'label'
                      , complex: true
//                      , innerHTML: '<div data-hint="checkgroup"><div data-prop="label"><input type="checkbox"></input><span></span></div></div>'
                      , innerHTML: '<div data-hint="checkgroup"><div data-prop="label"><input type="checkbox"><span>Option A</span></div></div>'
                    }

                  , radiogroup: {
                        label: 'Radio Button Group'
                      , hint: 'input|radiogroup'
                      , attributes: ['label']
                      , editor: editors.radiogroup
                      , edits: 'label'
                      , complex: true
                      , innerHTML: '<div data-hint="radiogroup"><div data-prop="label"><input type="radio"><span>Option A</span></div></div>'
                    }
                };
            },

            getNextId: function() { //FIXME: should be private
                return ++widgetCounter;
            }
        }
    }();

    app.main();
}, false);
