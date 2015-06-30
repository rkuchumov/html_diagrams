var dia = (function() { 
        var pub = {};
        console.assert = function() {};

        var EPS = 1e-9;

        /** Enum for diagram objects types
         * @readonly
         * @enum {Number}
         */
        var Type = { 
            line: 0,
            rect: 1,
            ellipse: 2,
        };

        /** Enum for line ends' styles
         * @readonly
         * @enum {Number}
         */
        var LineEnd = { 
            /** Straight line */
            none: 0,
            /** Angle bracket (<, >) */ 
            angle: 1,
            rhombus: 2, 
            circle: 3,
            triangle: 4,
        };

        /** Enum for line caption direction
         * @readonly
         * @enum {Number}
         */
        var CapDir = {
            /** Horizontal */
            hor: 0,
            /** Vertical */
            ver: 1,
        };

        /** Enum for line caption position
         * @readonly
         * @enum {Number}
         */
        var CapPos = {
            start: 0,
            center: 1,
            end: 2,
        };

        var LineStyle = { 
            solid: 0,
            dotted: 1,
            dashed: 2,
        };

        /** Checks if a string is a valid number
         * @return {Boolean} true, if specified string is a number, false otherwise
         */
        function isNum_(str) {
            return str.match(/^\d+$/);
        }

        /** Calulates elemnt's content width and height
         * @param {Element} element in DOM
         * @return {Size} element's content size
         */
        function getTextSize_(elem) {
            var w = (elem.clientWidth + 1);
            var h = (elem.clientHeight + 1);
            return new Size(w, h);
        }

        /** Fetches attributes names and values of specified element and 
         * returns them in lower case
         * @param {Element} elem DOM object to extract atrributes from
         * @return {Object<String, String>} atrributes' names and values in lowercase
         */
        function getAttribs_(elem) {
            var attr = {};
            for (var i = 0; i < elem.attributes.length; i++) {
                var e = elem.attributes[i];
                var name = e.name.toLowerCase();
                attr[name] = e.value.toLowerCase();
            }

            return attr;
        }

        /** Creates an instance of 2d point
         *
         * @constructor
         * @param {Number} x first coordinate
         * @param {Number} y second coordinate
         */
        function Point(x, y) {
            this.x = x;
            this.y = y;

            /** Manhattan distance between this and specified point
             * @name dist
             * @function
             * @param {Number} x first coordinate of another point
             * @param {Number} y second coordinate of another point
             * @return {Number} distance betweent this and specified point
             */
            /** Manhattan distance between this and specified point
             * @name^2 dist
             * @function
             * @param {Point} another point
             * @return {Number} distance betweent this and specified point
             */
            this.dist = function(x, y) {
                if (arguments.length == 1) {
                    return Math.abs(this.x - x.x) + Math.abs(this.y - x.y);
                } else if (arguments.length == 2) {
                    return Math.abs(this.x - x) + Math.abs(this.y - y);
                }
                return undefined;
            }
        }

        /** Creates an instance of size
         * @param {Number} w width
         * @param {Number} h height
         */
        function Size(w, h) {
            this.w = w;
            this.h = h;
        }

        /** Creates an instance of diagram config object. 
         * @param {Object} elem DOM object containing diagram discription
         * @property {Number} gridSize distance between grid's node. which is
         * used for calculating line's positions
         * @property {Number} capOffset caption offset from block and
         * corresponding line
         * @property {Number} id diagram discription id in DOM
         * @propery {Size} imgSize diagram size. Can be calculated after
         * blocks' positions are calulated 
         * @property {Number} [lineEndLenght=10] Lenght of the figure at the end of the line
         * @property {Number} [lineEndAngle=30] Angle of triangle, angle brackets or rhombus
         * ending figure
         * * @throws {String} Error message on incorrect attributes values
         */
        function Config(elem) {
            console.assert(elem instanceof Element, 
                'Empty diagam DOM object');

            this.elem = elem;
            this.gridSize = 10;
            this.capOffset = 2;
            this.lineEndLenght = 10;
            this.lineEndAngle = 30;

            var attribs = getAttribs_(elem);

            if ('dia-grid-size' in attribs) {
                var i = parseInt(attribs['dia-grid-size']);
                if (i > 0)
                    this.gridSize = i;
                else
                    throw 'Incorrect "dia-grid-size" value';
            }

            if ('dia-caption-offset' in attribs) {
                var i = parseInt(attribs['dia-caption-offset']);
                if (i > 0)
                    this.capOffset = i;
                else
                    throw 'Incorrect "dia-caption-offset" value';
            }

            this.id = attribs['id'];

            this.imgSize = null;
        }

        /** Creates diagramm image corresponding to specified description.
         * @param {String} id DOM's id of an object contating diagam description
         */
        pub.draw = function(id) {
            console.assert(typeof (id) == 'string', 
                'Incorrect diagram id: ' + id);

            try {
                var elem = document.getElementById(id);
                if (elem == undefined)
                    throw 'diagram element is not found';

                var cfg = new Config(elem);

                var blocks = [];
                var lines = [];
                var r = parseDescr_(cfg);
                blocks = r.blocks;
                lines = r.lines;

                blocksPos_(cfg, blocks);
                drawBlocks_(cfg, blocks);

                linesPos_(cfg, blocks, lines);
                drawLines_(cfg, lines);

                captionsPos_(cfg, lines);
                drawCaptions_(cfg, lines);
            } catch (e) {
                console.log('#' + id + ': ' + e);
            }
        }

        function setDivDefaultCSS_(elem) {
            console.assert(elem instanceof Element, 'Empty diagam DOM object');

            elem.style['position'] = 'absolute';
            elem.style['height'] = 'auto';
            elem.style['width'] = 'auto';
            elem.style['white-space'] = 'nowrap';
            elem.style['word-wrap'] = 'break-word';
            elem.style['text-align'] = 'center';
        }

        /** Travels diagram's child objects(DOM) and creates line or block instance 
         * for each object. 
         * @param {Config} cfg diagram config instance
         * @throws {String} error message (parsing error or out-of-scope id error)
         * @return {{blocks: Array.<Block>, lines: Array.<Line>}} Block and lines arrays
         */
        function parseDescr_(cfg) {
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');

            var blocks = [];
            var lines = [];
            for (var i = 0; i < cfg.elem.children.length; i++) {
                var e = cfg.elem.children[i];

                try {
                    setDivDefaultCSS_(e);

                    var attribs = getAttribs_(e);
                    delete getType_.hasPivot;
                    var t = getType_(attribs);

                    if (t != Type.line) {
                        blocks.push(new Block(cfg, attribs, e));
                    } else {
                        lines.push(new Line(attribs, e));
                    }
                } catch(str) {
                    throw '#' + attribs.id + ': ' + str;
                }
            }

            try {
                checkIdScope_(blocks, lines);
            } catch (e) {
                throw e;
            }

            return {'blocks': blocks, 'lines': lines};
        }

        /** Determines type of diagram object (line, rectangle, ellipse)
         * by its attributes
         * @param {Object<String, String>} atrributes' name and values
         * @return {Type} type of an object
         * @throws {String} error message when unable to detemine type
         * @property {Boolean} hasPivot true, if block without relative
         * position is found
         */
        function getType_(attribs) {
            console.assert(typeof (attribs) == 'object', 
                'Incorrect function arguments');

            if (('dia-line-start' in attribs) && ('dia-line-end' in attribs))
                return Type.line;

            if (attribs['dia-type'] == 'line')
                return Type.line;

            var hasPos = ('dia-pos' in attribs);
            var hasPivot = ('hasPivot' in getType_);

            if (hasPos || !hasPivot) {
                if (!hasPos)
                    getType_.hasPivot = true;

                if (!('dia-type' in attribs))
                    return Type.rect;

                if (attribs['dia-type'] == 'rectangle')
                    return Type.rect;
                if (attribs['dia-type'] == 'ellipse')
                    return Type.ellipse;

                throw 'Unknown "dia-type" value';
            } 

            throw 'No required attributes specified';
        }

        /** Creates block instance
         * @constructor
         * @param {Object<String, String>} blocks attributes
         * @param {Element} DOM object containing specified attributes
         * @property {Element} elem an object describing this block
         * @property {Number} [relDist=20] block's distanse relative to relId
         * @property {Number} [alignCur=0] an axis of this block corresponding 
         * to the letter in 'dia-aling' attribute. Possible values: -0.5, 0, 0.5
         * for C, B, A axes
         * @property {Number} [alignRel=0] an axis of relId block corresponding 
         * to the digit in 'dia-aling' attribute. Possible values: -0.5, 0, 0.5
         * for 3, 2, 1 axes
         * @property {Type} [type=Type.rect] block type (rectangle, ellispse)
         * @property {String} domId id of DOM element describing this block
         * @property {Point} relPos position of this block relative to relId block
         * @property {Size} size calculated block's size
         * @property {coords} block's absolute position
         * @proprty {Number} relId id of a block used for relative postioning 
         * and aligment 
         * @proprty {Number} prop proportions (width / height)
         * @throws {String} an error message if unable to parse attribute's value
         */
        function Block(cfg, attribs, e) {
            console.assert(typeof (attribs) == 'object', 
                'Incorrect function arguments');
            console.assert(e instanceof Element, 
                'Incorrect function arguments');
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');

            this.elem = e;
            this.relDist = 2 * cfg.gridSize;
            this.alignCur = 0;
            this.alignRel = 0;

            this.type = Type.rect;
            if (attribs['dia-type'] == 'ellipse')
                this.type = Type.ellipse;

            this.domId = attribs['id'];

            if ('dia-pos' in attribs) {
                var a = attribs['dia-pos'].split('+');

                if (a.length < 2)
                    throw 'Incorrect "dia-pos" value';

                this.relId = a[0];

                var pos;
                switch (a[1]) {
                case 'n':  pos = new Point( 0, -1); break;
                case 's':  pos = new Point( 0,  1); break;
                case 'w':  pos = new Point(-1,  0); break;
                case 'e':  pos = new Point( 1,  0); break;
                case 'nw': pos = new Point(-1, -1); break;
                case 'ne': pos = new Point( 1, -1); break;
                case 'sw': pos = new Point(-1,  1); break;
                case 'se': pos = new Point( 1,  1); break;
                default: throw 'Incorrect "dia-pos" value (postion)';
                }
                this.relPos = pos;

                if (a[2] != null) {
                    if (a[2].substr(-2) != 'px')
                        throw 'Incorrect "dia-pos" value (size)';

                    this.relDist = parseInt(a[2]);
                    if (this.relDist <= 0)
                        throw 'Incorrect "dia-pos" value (size)';
                } 
            }

            if ('dia-align' in attribs) {
                var rel;
                switch (attribs['dia-align'][0]) {
                case 'a': rel = -0.5; break;
                case 'b': rel = 0; break;
                case 'c': rel = 0.5; break;
                default: throw 'Incorrect "dia-align" value';
                }

                var cur;
                switch (attribs['dia-align'][1]) {
                case '1': cur = 0.5; break;
                case '2': cur = 0; break;
                case '3': cur = -0.5; break;
                default: throw 'Incorrect "dia-align" value';
                }

                this.alignCur = cur;
                this.alignRel = rel;
            }

            if ('dia-size' in attribs) {
                var a = attribs['dia-size'].split(':');

                if (a.length != 2)
                    throw 'Incorrect "dia-size" value';

                var w = parseInt(a[0]);
                var h = parseInt(a[1]);

                if (a[0].substr(-2) == 'px' && a[1].substr(-2) == 'px') {
                    this.minSize = new Size(w, h);
                } else if (isNum_(a[0]) && isNum_(a[1])
                    && w > 0 && h > 0)
                {
                    this.prop = w / h;
                } else {
                    throw 'Incorrect "dia-size" value';
                }
            }

            if ('dia-coords' in attribs) {
                throw 'Absolute positioning is not impemented yet';

                var a = attribs['dia-coords'].split(':');

                if (a.length != 2)
                    throw 'Incorrect "dia-coords" value';

                var x = parseInt(a[0]);
                var y = parseInt(a[1]);

                if (a[0].substr(-2) == 'px' && a[1].substr(-2) == 'px'
                    && x > 0 && y > 0) 
                {
                    this.coords = new Point(x, y);
                } else {
                    throw 'Incorrect "dia-coords" value';
                }
            }

            if (this.type == Type.rect) {
                this.size = rectSize_(this);
            } else if (this.type == Type.ellipse) {
                this.size = ellipseSize_(this);
            }
        }

        /** Creates line instance
         * @param {Object<String, String>} line attributes
         * @param {Element} DOM object containing specified attributes
         * @property {Element} elem an object describing this line
         * @property {Number} startBlockId id of a block this line starts from
         * @property {Number} endBlockId id of a block this line ends
         * @property {LineEnd} [startStyle=LineEnd.none] 
         * style at the beginning of the line
         * @property {Point} startBlockPos position of the beginning of the line
         * at the starting block
         * @property {Point} endBlockPos position of the beginning of the line
         * at the starting block
         * @property {LineEnd} [endStyle=LineEnd.none] 
         * style at the end of the line
         * @property {CapPos} [capPos=CapPos.center] caption position
         * @property {CapDir} [capDir=CapDir.hor] caption direction
         * @property {Number} [lineWidth=1] line width
         * @property {LineStyle} [lineStyle=LineStyle.solid] line style
         * @property {String} [lineColor='black'] line color
         * @property {String} domId id of DOM element describing this line
         * @throws {String} an error message if unable to parse attribute's value
         */
        function Line(attribs, e) {
            console.assert(typeof (attribs) == 'object', 
                'Incorrect function arguments');
            console.assert(e instanceof Element,
                'Incorrect function arguments');

            this.elem = e;
            this.startStyle = LineEnd.none;
            this.endStyle = LineEnd.none;
            this.capPos = CapPos.center;
            this.capDir = CapDir.hor;
            this.lineWidth = 2;
            this.lineStyle = LineStyle.solid;
            this.lineColor = "black";
            this.domId = attribs['id'];

            /** Parses values of 'dia-line-start' or 'dia-line-end' attributes
             * @param {String} attribute value
             * @return {Object} ret parsed value
             * @return {String} ret.id id of an end block
             * @return {Point} ret.pos line's end position 
             * @return {LineEnd} ret.sh line's end style
             * @throws {String} an error message if unable to parse attribute's value
             */
            function lineEnd_(str) {
                console.assert(typeof (str) == 'string', 'Incorrect function arguments');

                var ret = {};
                var a = str.split('+');

                if (a.length < 2)
                    throw '';

                ret['id'] = a[0];

                var pos;
                switch (a[1]) {
                case 'n':  pos = new Point( 0, -1); break;
                case 's':  pos = new Point( 0,  1); break;
                case 'w':  pos = new Point(-1,  0); break;
                case 'e':  pos = new Point( 1,  0); break;
                case 'nw': pos = new Point(-1, -1); break;
                case 'ne': pos = new Point( 1, -1); break;
                case 'sw': pos = new Point(-1,  1); break;
                case 'se': pos = new Point( 1,  1); break;
                default: throw 'position';
                }
                ret['pos'] = pos;

                var sh;
                switch (a[2]) {
                case 'none': sh = LineEnd.none; break;
                case 'angle': sh = LineEnd.angle; break;
                case 'rhombus': sh = LineEnd.rhombus; break;
                case 'circle': sh = LineEnd.circle; break;
                case 'triangle': sh = LineEnd.triangle; break;
                case undefined: sh = null; break;
                default: throw 'end style';
                }
                ret['sh'] = sh;

                return ret;
            }

            try {
                var s = lineEnd_(attribs['dia-line-start']);
                this.startBlockId = s.id;
                this.startBlockPos = s.pos;
                if (s.sh != null)
                    this.startStyle = s.sh;
            } catch (s) {
                throw 'Incorrect "dia-line-start" value (' + s + ')';
            }

            try {
                var e = lineEnd_(attribs['dia-line-end']);
                this.endBlockId = e.id;
                this.endBlockPos = e.pos;
                if (e.sh != null)
                    this.endStyle = e.sh;
            } catch (s) {
                throw 'Incorrect "dia-line-end" value (' + s + ')';
            }


            switch (attribs['dia-direction']) {
            case 'hor': this.capDir = CapDir.hor; break;
            case 'ver': this.capDir = CapDir.ver; break;
            case undefined: break;
            default: throw 'Incorrect "dia-direction" value';
            }

            switch (attribs['dia-text-pos']) {
            case 'center': this.capPos = CapPos.center; break;
            case 'start': this.capPos = CapPos.start; break;
            case 'end': this.capPos = CapPos.end; break;
            case undefined: break;
            default: throw 'Incorrect "dia-text-pos" value';
            }

            if ('dia-line-style' in attribs) {
                var a = attribs['dia-line-style'].split(' ');
                
                if (a.length) {
                    var w = parseInt(a[0]);
                    if (w > 0)
                        this.lineWidth = w;
                }

                if (a.length > 1) {
                    switch (a[1]) {
                    case 'solid': this.lineStyle = LineStyle.solid; break;
                    case 'dotted': this.lineStyle = LineStyle.dotted; break;
                    case 'dashed': this.lineStyle = LineStyle.dashed; break;
                    default: throw 'Incorrect "dia-line-style" value';
                    }
                }

                if (a.length > 2) {
                    this.lineColor = a[2];
                }
            }
        }

        /** Checks if blocks' relId and lines' startBlockId and endBlockId 
         * reffers to blocks from current diagram. Sets id property to each
         * block with the value equal to its index in array. On success, 
         * values of the properties specified above will be replaced by 
         * the resp. id (indexes in array).
         *
         * @param {Array.<Block>} blocks diagram's blocks
         * @param {Array.<Line>} lines diagram's lines
         * @throws {String} error message when id doesn't belong to current diagram
         */
        function checkIdScope_(blocks, lines) {
            console.assert(blocks instanceof Array, 
                'Incorrect function arguments');
            console.assert(lines instanceof Array, 
                'Incorrect function arguments');

            for (var i = 0; i < blocks.length; i++) {
                console.assert(blocks[i] instanceof Block, 
                    'Incorrect function arguments');

                blocks[i].id = i;

                if (blocks[i].domId == undefined)
                    continue;

                for (var j = 0; j < blocks.length; j++) {
                    if (blocks[j].relId == blocks[i].domId)
                        blocks[j].relId = i;
                }

                for (var j = 0; j < lines.length; j++) {
                    if (lines[j].startBlockId == blocks[i].domId)
                        lines[j].startBlockId = i;
                    if (lines[j].endBlockId == blocks[i].domId)
                        lines[j].endBlockId = i;
                }
            }

            for (var i = 0; i < blocks.length; i++) {
                if (typeof (blocks[i].relId) == 'string')
                    throw blocks[i].domId + ': #' + blocks[i].relId +
                        ' doesn\'t belong to diagram';
            }

            for (var i = 0; i < lines.length; i++) {
                if (typeof (lines[i].startBlockId) != 'number') {
                    throw lines[i].domId + ': id #' + lines[i].startBlockId +
                        ' doesn\'t belong to diagram';
                }
                if (typeof (lines[i].endBlockId) != 'number') {
                    throw lines[i].domId + ': id #' + lines[i].endBlockId +
                        ' doesn\'t belong to diagram';
                }
            }
        }

        /** Calculates rectangle block size. The size is calculated 
         * according to block's proportions or min. size and is greater 
         * than the size of block's text
         */
        function rectSize_(block) {
            console.assert(block instanceof Block, 
                'Incorrect function arguments');

            var text = getTextSize_(block.elem);
            console.assert(text instanceof Size);
            console.assert(text.w > 0);
            console.assert(text.h > 0);

            if (block.prop == undefined && block.minSize == undefined) {
                return text;
            }

            var p;
            if (block.minSize != undefined) {
                if (block.minSize.w >= text.w && block.minSize.h >= text.h)
                    return block.minSize;
                p = block.minSize.w / block.minSize.h;
            } else if (block.prop != undefined) {
                p = block.prop;
            }
            console.assert(p > 0, 'Propotions <= 0');

            var tp = text.w / text.h;
            if (tp > 1 && p < 1 || p <= tp)
                return new Size(text.w, text.w / p);
            if (tp < 1 && p > 1 || p > tp)
                return new Size(text.h * p, text.h);
        }

        /** Calculates ellipse block size. The size is calculated 
         * according to block's proportions or min. size and is greater 
         * than the size of block's text
         */
        function ellipseSize_(block) {
            console.assert(block instanceof Block, 
                'Incorrect function arguments');

            var text = getTextSize_(block.elem);
            console.assert(text instanceof Size);
            console.assert(text.w > 0);
            console.assert(text.h > 0);

            if (block.prop == undefined && block.minSize == undefined)
                return new Size(Math.sqrt(2) * text.w, Math.sqrt(2) * text.h);

            if (block.minSize != undefined) {
                if (Math.sqrt(2) * text.w < block.minSize.w
                    && Math.sqrt(2) * text.h < block.minSize.h) 
                {
                    return block.minSize;
                }

                return new Size(Math.sqrt(2) * text.w, Math.sqrt(2) * text.h);
            }

            var p = block.prop;
            console.assert(p > 0, 'Propotions <= 0');

            var tp = text.w / text.h;
            var s;
            if (tp > 1 && p < 1 || p <= tp)
                s = new Size(text.w, text.w / p);
            if (tp < 1 && p > 1 || p > tp)
                s = new Size(text.h * p, text.h);

            s.w *= Math.sqrt(2);
            s.h *= Math.sqrt(2);
            return s;
        }

        /** Caclulates image size and blocks' absolute positions
         * @throws {String} Error message if there are blocks overlaping 
         * each other
         */
        function blocksPos_(cfg, blocks) {
            console.assert(blocks instanceof Array, 
                'Incorrect function arguments');
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');

            blocksRelPos_(cfg, blocks);
            blocksAbsPos_(cfg, blocks);

            try {
                checkOverlaps_(cfg, blocks);
            } catch (e) {
                throw e;
            }
        }

        /** Caclulates blocks positions relative to the first block in array
         * or to the block without 'dia-pos' attribute.
         */
        function blocksRelPos_(cfg, blocks) {
            console.assert(blocks instanceof Array, 
                'Incorrect function arguments');
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');

            for (var i = 0; i < blocks.length; i++) {
                console.assert(blocks[i] instanceof Block, 
                    'Incorrect function arguments');
                console.assert(blocks[i].size instanceof Size, 
                    'Block size is not set');

                if (blocks[i].relId !== undefined)
                    continue;

                var t = blocks[0];
                blocks[0] = blocks[i];
                blocks[i] = t;
                break;
            } 

            blocks[0].coords = new Point(0, 0);

            for (var i = 0; i < blocks.length; i++) { 
                for (var j = 0; j < blocks.length; j++) { 
                    // pivot or block with abs position
                    if (blocks[j].relId == undefined) 
                        continue;
                    if (blocks[j].relId != blocks[i].id)
                        continue;

                    //Координаты блока j = 
                    //     коорд i
                    //     + расстояние между центрами по одной из компонент
                    //     + aligment (выравнивание) по другой

                    var x = blocks[i].coords.x + 
                        blocks[j].relPos.x * (blocks[i].size.w / 2 
                            + blocks[j].relDist + blocks[j].size.w / 2) +
                        (blocks[j].alignCur * blocks[j].size.w 
                            + blocks[j].alignRel * blocks[i].size.w) 
                        * (1 - Math.abs(blocks[j].relPos.x));

                    var y = blocks[i].coords.y + 
                        blocks[j].relPos.y * (blocks[i].size.h / 2 
                            + blocks[j].relDist + blocks[j].size.h / 2) +
                        (blocks[j].alignCur * blocks[j].size.h 
                            + blocks[j].alignRel * blocks[i].size.h)
                        * (1 - Math.abs(blocks[j].relPos.y));

                    blocks[j].coords = new Point(x, y);
                }
            }
        }

        /** Caclulates blocks positions relative to the image top left corner.
         * Sets image size.
         */
        function blocksAbsPos_(cfg, blocks) {
            console.assert(blocks instanceof Array, 
                'Incorrect function arguments');
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');

            // top left and bottom right image coordinates relative to the 
            // first block
            var left = Number.MAX_VALUE;
            var right = -Number.MAX_VALUE;
            var top_ = Number.MAX_VALUE;
            var bottom = -Number.MAX_VALUE;
            for (var i = 0; i < blocks.length; i++) {
                var l = blocks[i].coords.x - blocks[i].size.w / 2;
                if (l < left) left = l;

                var r = blocks[i].coords.x + blocks[i].size.w / 2;
                if (r > right) right = r;

                var t = blocks[i].coords.y - blocks[i].size.h / 2;
                if (t < top_) top_ = t;

                var b = blocks[i].coords.y + blocks[i].size.h / 2;
                if (b > bottom) bottom = b;
            }

            left -= 2 * cfg.gridSize;
            right += 2 * cfg.gridSize;
            top_ -= 2 * cfg.gridSize;
            bottom += 2 * cfg.gridSize;

            var w = Math.ceil(right - left);
            var h = Math.ceil(bottom - top_);
            if (w % cfg.gridSize != 0)
                w += cfg.gridSize - w % cfg.gridSize;
            if (h % cfg.gridSize != 0)
                h += cfg.gridSize - h % cfg.gridSize;
            cfg.imgSize = new Size(w, h);

            for (var i = 0; i < blocks.length; i++) {
                    blocks[i].coords.x += -left;
                    blocks[i].coords.y += -top_;
            }
        }

        /** Checks if there is two blocks overlapping each other
         *
         * @throws {String} Error message if there are blocks overlaping
         */
        function checkOverlaps_(cfg, blocks) {
            console.assert(blocks instanceof Array, 
                'Incorrect function arguments');
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');

            for (var i = 0; i < blocks.length; i++) { 
                for (var j = i + 1; j < blocks.length; j++) { 
                    var dx = Math.abs(blocks[i].coords.x - blocks[j].coords.x);
                    var dy = Math.abs(blocks[i].coords.y - blocks[j].coords.y);

                    var w = 2 * cfg.gridSize +
                        (blocks[i].size.w + blocks[j].size.w) / 2;
                    var h = 2 * cfg.gridSize +
                        (blocks[i].size.h + blocks[j].size.h) / 2;

                    if (dx - w < -EPS && dy - h < -EPS)
                        throw "#" + blocks[i].domId + " overlaps #" + blocks[j].domId;
                }
            }
        }

        /* Draws blocks by setting CSS values to resp. DOM elements
         */
        function drawBlocks_(cfg, blocks) {
            console.assert(blocks instanceof Array, 
                'Incorrect function arguments');
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');
            console.assert(typeof (cfg.imgSize) != null, 
                'Incorrect function arguments');

            cfg.elem.style['width'] = cfg.imgSize.w + 'px';
            cfg.elem.style['height'] = cfg.imgSize.h + 'px';
            cfg.elem.style['position'] = 'relative';

            for (var i = 0; i < blocks.length; i++) {
                var block = blocks[i];
                var top_ = block.coords.y - block.size.h / 2;
                var left = block.coords.x - block.size.w / 2;

                block.elem.style['top'] = top_ + 'px';
                block.elem.style['left'] = left + 'px';
                block.elem.style['width'] = block.size.w + 'px';
                block.elem.style['height'] = block.size.h + 'px';

                if (block.type == Type.ellipse) {
                    var r = (block.size.w / 2) + "px/" +
                        (block.size.h / 2) + "px";
                    block.elem.style['-moz-border-radius'] = r;
                    block.elem.style['-webkit-border-radius'] = r;
                    block.elem.style['border-radius'] = r;
                }

                var h = '<span>' + block.elem.innerHTML + '</span>';
                block.elem.innerHTML = h;

                block.elem.children[0].style['display'] = 'table-cell';
                block.elem.children[0].style['vertical-align'] = 'middle';
                block.elem.children[0].style['height'] = block.size.h + 'px';
                block.elem.children[0].style['width'] = block.size.w + 'px';
            }
        }

        function findBlock_(blocks, id) {
            console.assert(blocks instanceof Array, 
                'Incorrect function arguments');
            console.assert(typeof (id) == 'number', 
                'Incorrect function arguments');
            console.assert(id >= 0, 'Incorrect function arguments');

            for (var i = 0; i < blocks.length; i++) {
                if (blocks[i].id == id)
                    return blocks[i];
            }
            return undefined;
        }

        function linesPos_(cfg, blocks, lines) {
            console.assert(blocks instanceof Array, 
                'Incorrect function arguments');
            console.assert(lines instanceof Array, 
                'Incorrect function arguments');
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');

            var g = new Grid(cfg, blocks);
            fillGrid_(g, blocks);
            

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];

                // XXX: ends postions 
                var s = findBlock_(blocks, line.startBlockId);

                if (s.type == Type.ellipse && 
                    (Math.abs(line.startBlockPos.x) + Math.abs(line.startBlockPos.y) == 2))
                {
                    throw 'NW, NE, SW, SE line positions for ellipses is not implimented';
                }

                var stX = s.coords.x + 0.5 * s.size.w * line.startBlockPos.x;
                var stY = s.coords.y + 0.5 * s.size.h * line.startBlockPos.y;
                var start = new Point(
                    Math.round(stX / g.h), Math.round(stY / g.h)
                );

                var e = findBlock_(blocks, line.endBlockId);

                if (e.type == Type.ellipse && 
                    (Math.abs(line.endBlockPos.x) + Math.abs(line.endBlockPos.y) == 2))
                {
                    throw 'NW, NE, SW, SE line positions for ellipses is not implimented';
                }

                var enX = e.coords.x + 0.5 * e.size.w * line.endBlockPos.x;
                var enY = e.coords.y + 0.5 * e.size.h * line.endBlockPos.y;
                var end = new Point(
                    Math.round(enX / g.h), Math.round(enY / g.h)
                );

                line.points = findPath(g, start, end);
            }
        }

        function Grid(cfg) {
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');

            this.h = cfg.gridSize;
            this.n = cfg.imgSize.w / this.h + 1;
            this.m = cfg.imgSize.h / this.h + 1;

            var g = new Array(this.m);
            for (var j = 0; j < this.m; j++)
                g[j] = new Array(this.n);

            this.empty = function(x, y) {
                console.assert(arguments.length == 1 || arguments.length == 2,
                    'Incorrect function arguments');

                if (arguments.length == 1) {
                    return g[x.y][x.x] == true;
                } else if (arguments.length == 2) {
                    return g[y][x] == true;
                }
            }

            this.setEmpty = function(x, y, val) {
                console.assert(arguments.length == 2 || arguments.length == 3,
                    'Incorrect function arguments');

                if (arguments.length == 2) {
                    g[x.y][x.x] = y;
                } else if (arguments.length == 3) {
                    g[y][x] = val;
                }
                return undefined;
            }

            this.id = function(node) {
                console.assert(node instanceof Point,
                    'Incorrect function arguments');

                return node.y * this.n + node.x;
            }

            this.node = function(id) {
                var y = Math.floor(id / this.n);
                var x = id % this.n;
                return new Point(x, y);
            }

            this.g = g;
        }

        function fillGrid_(grid, blocks) {
            console.assert(grid instanceof Grid, 
                'Incorrect function arguments');
            console.assert(blocks instanceof Array, 
                'Incorrect function arguments');

            for (var j = 0; j < grid.m; j++)
                for (var i = 0; i < grid.n; i++)
                    grid.setEmpty(i, j, true);

            for (var k = 0; k < blocks.length; k++) {
                var block = blocks[k];

                console.assert(block instanceof Block, 
                    'Incorrect function arguments');

                var l = block.coords.x - 0.5 * block.size.w;
                var r = block.coords.x + 0.5 * block.size.w;
                var b = block.coords.y - 0.5 * block.size.h;
                var t = block.coords.y + 0.5 * block.size.h;

                for (var j = 0; j < grid.m; j++) {
                    for (var i = 0; i < grid.n; i++) {
                        var x = i * grid.h;
                        var y = j * grid.h;

                        if (x >= l && x <= r && y >= b && y <= t)
                            grid.setEmpty(i, j, false);
                    }
                }

            }

            for (var j = 0; j < grid.m; j++) {
                grid.setEmpty(0, j, false);
                grid.setEmpty(grid.n - 1, j, false);
            }

            for (var i = 0; i < grid.n; i++) {
                grid.setEmpty(i, 0, false);
                grid.setEmpty(i, grid.m - 1, false);
            } 
        }

        function findPath(grid, start, end) {
            console.assert(grid instanceof Grid, 
                'Incorrect function arguments');
            console.assert(start instanceof Point, 
                'Incorrect function arguments');
            console.assert(end instanceof Point, 
                'Incorrect function arguments');

            grid.setEmpty(end, true);

            var parents = bfs_(grid, start, end);
            if (parents == null)
                return null;

            return restorePath_(grid, parents, start, end);
        }

        function bfs_(grid, start, end) {
            console.assert(grid instanceof Grid, 
                'Incorrect function arguments');
            console.assert(start instanceof Point, 
                'Incorrect function arguments');
            console.assert(end instanceof Point, 
                'Incorrect function arguments');

            var open = [];
            open.push(start);
            var closed = [];

            var path = [];
            path[grid.id(start)] = grid.id(start);

            var dx = [ 0,  1,  0, -1];
            var dy = [-1,  0,  1,  0];

            while (open.length != 0) {
                var u = open.shift();

                for (var d = 0; d < dx.length; d++) {
                    var v = new Point(u.x + dx[d], u.y + dy[d]);
                    if (!grid.empty(v))
                        continue;
                    if (grid.id(v) in closed)
                        continue;

                    closed[grid.id(v)] = true;

                    open.push(v);
                    path[grid.id(v)] = grid.id(u);
                }
            }

            if (!(grid.id(end) in closed)) {
                console.log("path not found");
                return null;
            }

            return path;
        }

        function restorePath_(grid, path, start, end) {
            console.assert(grid instanceof Grid, 
                'Incorrect function arguments');
            console.assert(path instanceof Array, 
                'Incorrect function arguments');
            console.assert(start instanceof Point, 
                'Incorrect function arguments');
            console.assert(end instanceof Point, 
                'Incorrect function arguments');

            var prev = end;
            var cur = grid.node(path[grid.id(prev)]);

            var p = [];
            p.push(new Point(prev.x * grid.h, prev.y * grid.h));

            var prevDir = (prev.x == cur.x) ? 1 : 0;

            while (grid.id(cur) != grid.id(start)) {
                prev = cur;
                var cur = grid.node(path[grid.id(prev)]);

                if (grid.id(cur) == grid.id(prev))
                    break;

                var curDir = (prev.x == cur.x) ? 1 : 0;
                if (prevDir != curDir)
                    p.push(new Point(prev.x * grid.h, prev.y * grid.h));
                prevDir = curDir;
            }
            p.push(new Point(cur.x * grid.h, cur.y * grid.h));

            p.reverse();

            return p; 
        }

        function drawLines_(cfg, lines) {
            console.assert(cfg instanceof Config,
                'Incorrect function arguments');
            console.assert(lines instanceof Array, 
                'Incorrect function arguments');

            var id = cfg.id + 'Canvas';
            cfg.elem.insertAdjacentHTML('beforeend', '<canvas ' + 
                'id="' + id + '" ' + 
                'width="' + cfg.imgSize.w + 'px" ' +
                'height="' + cfg.imgSize.h + 'px">' +
                'Your browser does not support the HTML5 canvas tag.' + 
                '</canvas>');

            var canvas = document.getElementById(id);
            if (!canvas.getContext) {
                throw 'Your browser does not support the HTML5 canvas tag.';
            }

            var ctx = canvas.getContext('2d');

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];

                console.assert(line instanceof Line, 
                    'Incorrect function arguments');

                ctx.beginPath();
                ctx.strokeStyle = line.lineColor;
                ctx.lineWidth = line.lineWidth;
                ctx.fillStyle = line.lineColor;

                if (line.lineStyle == LineStyle.dotted) {
                    ctx.setLineDash([line.lineWidth,line.lineWidth]);
                } else if (line.lineStyle == LineStyle.dashed) {
                    ctx.setLineDash([
                            4 * line.lineWidth,
                            1.5 * line.lineWidth
                        ]);
                } else {
                    ctx.setLineDash([]);
                }
                var prev = line.points[0];
                ctx.moveTo(prev.x, prev.y);
                var cur = line.points[1];
                ctx.lineTo(cur.x, cur.y);

                var n = line.points.length;
                console.assert(n >= 2, 'Lines path is empty');

                for (var j = 2; j < n; j++) {
                    prev = cur;
                    cur = line.points[j];

                    ctx.moveTo(prev.x, prev.y);
                    ctx.lineTo(cur.x, cur.y);
                }
                ctx.stroke();
                ctx.closePath();

                ctx.setLineDash([]);

                var start = line.points[0];
                var startDir = new Point(start.x - line.points[1].x,
                    start.y - line.points[1].y);

                var end = line.points[n - 1];
                var endDir = new Point(end.x - line.points[n - 2].x,
                    end.y - line.points[n - 2].y);

                if (line.startStyle == LineEnd.angle) {
                    drawAngleEnd(cfg, ctx, start, startDir);
                } else if (line.startStyle == LineEnd.triangle) {
                    drawTriangleEnd(cfg, ctx, start, startDir);
                } else if (line.startStyle == LineEnd.circle) {
                    drawCircleEnd(cfg, ctx, start, startDir);
                } else if (line.startStyle == LineEnd.rhombus) {
                    drawRhombusEnd(cfg, ctx, start, startDir);
                }

                if (line.endStyle == LineEnd.angle) {
                    drawAngleEnd(cfg, ctx, end, endDir);
                } else if (line.endStyle == LineEnd.triangle) {
                    drawTriangleEnd(cfg, ctx, end, endDir);
                } else if (line.endStyle == LineEnd.circle) {
                    drawCircleEnd(cfg, ctx, end, endDir);
                } else if (line.endStyle == LineEnd.rhombus) {
                    drawRhombusEnd(cfg, ctx, end, endDir);
                }
            }
        }

        function drawAngleEnd(cfg, ctx, point, dir) {
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');
            console.assert(ctx instanceof CanvasRenderingContext2D,
                'Incorrect function arguments');
            console.assert(point instanceof Point,
                'Incorrect function arguments');
            console.assert(dir instanceof Point, 
                'Incorrect function arguments');
            console.assert(cfg.lineEndAngle > 0 && cfg.lineEndAngle < 90,
                'Line angle should be 0 < a < 90')

            var d = cfg.lineEndLenght;
            var phi = Math.tan(30 * Math.PI / 180);

            if (dir.y == 0) {
                var x;
                if (dir.x < 0)
                    x = point.x + d;
                if (dir.x > 0)
                    x = point.x - d;

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(x, point.y - d * phi);
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(x, point.y + d * phi);
                ctx.stroke();
            }

            if (dir.x == 0) {
                var y;
                if (dir.y < 0)
                    y = point.y + d;
                if (dir.y > 0)
                    y = point.y - d;

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(point.x - d * phi, y);
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(point.x + d * phi, y);
                ctx.stroke();
            }
        }

        function drawTriangleEnd(cfg, ctx, point, dir) {
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');
            console.assert(ctx instanceof CanvasRenderingContext2D,
                'Incorrect function arguments');
            console.assert(point instanceof Point,
                'Incorrect function arguments');
            console.assert(dir instanceof Point, 
                'Incorrect function arguments');
            console.assert(cfg.lineEndAngle > 0 && cfg.lineEndAngle < 90,
                'Line angle should be 0 < a < 90')

            var d = cfg.lineEndLenght;
            var phi = Math.tan(cfg.lineEndAngle * Math.PI / 180);

            if (dir.y == 0) {
                var x;
                if (dir.x < 0)
                    x = point.x + d;
                if (dir.x > 0)
                    x = point.x - d;

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(x, point.y - d * phi);
                ctx.lineTo(x, point.y + d * phi);
                ctx.closePath();
                ctx.fill();
            }

            if (dir.x == 0) {
                var y;
                if (dir.y < 0)
                    y = point.y + d;
                if (dir.y > 0)
                    y = point.y - d;

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(point.x - d * phi, y);
                ctx.lineTo(point.x + d * phi, y);
                ctx.closePath();
                ctx.fill();
            }
        }

        function drawCircleEnd(cfg, ctx, point, dir) {
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');
            console.assert(ctx instanceof CanvasRenderingContext2D,
                'Incorrect function arguments');
            console.assert(point instanceof Point,
                'Incorrect function arguments');
            console.assert(dir instanceof Point, 
                'Incorrect function arguments');
            console.assert(cfg.lineEndAngle > 0 && cfg.lineEndAngle < 90,
                'Line angle should be 0 < a < 90')

            var d = cfg.lineEndLenght;

            if (dir.y == 0) {
                var x;
                if (dir.x < 0)
                    x = point.x + d / 2;
                if (dir.x > 0)
                    x = point.x - d / 2;

                ctx.beginPath();
                ctx.arc(x, point.y, d / 2, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.fill();
            }

            if (dir.x == 0) {
                var y;
                if (dir.y < 0)
                    y = point.y + d / 2;
                if (dir.y > 0)
                    y = point.y - d / 2;

                ctx.beginPath();
                ctx.arc(point.x, y, d / 2, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.fill();
            }
        }

        function drawRhombusEnd(cfg, ctx, point, dir) {
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');
            console.assert(ctx instanceof CanvasRenderingContext2D,
                'Incorrect function arguments');
            console.assert(point instanceof Point,
                'Incorrect function arguments');
            console.assert(dir instanceof Point, 
                'Incorrect function arguments');
            console.assert(cfg.lineEndAngle > 0 && cfg.lineEndAngle < 90,
                'Line angle should be 0 < a < 90')

            var d = cfg.lineEndLenght;
            var phi = Math.tan(cfg.lineEndAngle * Math.PI / 180);

            if (dir.y == 0) {
                var x;
                if (dir.x < 0)
                    x = point.x + d;
                if (dir.x > 0)
                    x = point.x - d;

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(x, point.y - d * phi);

                if (dir.x < 0)
                    ctx.lineTo(point.x + 2 * d, point.y);
                if (dir.x > 0)
                    ctx.lineTo(point.x - 2 * d, point.y);

                ctx.lineTo(x, point.y + d * phi);

                ctx.closePath();
                ctx.fill();
            }

            if (dir.x == 0) {
                var y;
                if (dir.y < 0)
                    y = point.y + d;
                if (dir.y > 0)
                    y = point.y - d;

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(point.x - d * phi, y);

                if (dir.y < 0)
                    ctx.lineTo(point.x, point.y + 2 * d);
                if (dir.y > 0)
                    ctx.lineTo(point.x, point.y - 2 * d);

                ctx.lineTo(point.x + d * phi, y);

                ctx.closePath();
                ctx.fill();
            }
        }

        function captionPos_(cfg, line) {
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');
            console.assert(line instanceof Line,
                'Incorrect function arguments');

            var p;
            var dx, dy;
            if (line.capPos == CapPos.start) {
                p = line.points[0];

                dx = line.points[1].x - line.points[0].x;
                dy = line.points[1].y - line.points[0].y;

            } else if (line.capPos == CapPos.end) {
                var n = line.points.length - 1;

                p = line.points[n];

                dx = line.points[n - 1].x - line.points[n].x;
                dy = line.points[n - 1].y - line.points[n].y;
            } else if (line.capPos == CapPos.center) {
                var len = 0;
                for (var i = 1; i < line.points.length; i++)
                    len += line.points[i].dist(line.points[i - 1]);

                var l = 0;
                var s;
                for (s = 1; s < line.points.length; s++) {
                    var ll = line.points[s].dist(line.points[s - 1]);
                    if (l + ll >= (len / 2))
                        break;
                    l += ll;
                }

                dx = line.points[s].x - line.points[s - 1].x;
                dy = line.points[s].y - line.points[s - 1].y;

                p = new Point(line.points[s - 1].x, line.points[s - 1].y);
                if (dx < 0)
                    p.x -= len / 2 - l; 
                else if (dx > 0)
                    p.x += len / 2 - l; 
                if (dy < 0)
                    p.y -= len / 2 - l; 
                else if (dy > 0)
                    p.y += len / 2 - l; 
            }

            var x;
            var y;
            var e = cfg.capOffset;
            var text = getTextSize_(line.elem);
            if (line.capDir == CapDir.ver) {
                text = new Size(text.h, text.w);
            }

            if (line.capPos != CapPos.center) {
                if (dx != 0) {
                    if (dx > 0) 
                        x = p.x + e;
                    if (dx < 0) 
                        x = p.x - e - text.w;
                    if (line.capDir == CapDir.hor)
                        y = p.y - e - text.h;
                    if (line.capDir == CapDir.ver)
                        y = p.y - text.h / 2;
                }
                if (dy != 0) {
                    if (dy > 0)
                        y = p.y + e;
                    if (dy < 0)
                        y = p.y - e - text.h;
                    if (line.capDir == CapDir.hor)
                        x = p.x - text.w / 2;
                    if (line.capDir == CapDir.ver) 
                        x = p.x - e - text.w;
                }
            } else {
                if (line.capDir == CapDir.hor) {
                    x = p.x - text.w / 2;
                    if (dx != 0) 
                        y = p.y - e - text.h;
                    if (dy != 0) 
                        y = p.y - text.h / 2;
                } else {
                    y = p.y - text.h / 2;
                    if (dx != 0)
                        x = p.x - text.w / 2;
                    if (dy != 0)
                        x = p.x - e - text.w;
                }
            }

            if (line.capDir == CapDir.ver) {
                x = x - text.w - e;
                y = y + text.w + e;
            }

            line.capCoords = new Point(x, y);
        }

        function captionsPos_(cfg, lines) {
            console.assert(cfg instanceof Config,
                'Incorrect function arguments');
            console.assert(lines instanceof Array, 
                'Incorrect function arguments');

            for (var i = 0; i < lines.length; i++) {
                console.assert(lines[i] instanceof Line, 
                    'Incorrect function arguments');
                if (lines[i].elem.innerHTML != '') {
                    captionPos_(cfg, lines[i]);
                }
            }
        }

        function drawCaptions_(cfg, lines) {
            console.assert(cfg instanceof Config, 
                'Incorrect function arguments');
            console.assert(lines instanceof Array, 
                'Incorrect function arguments');

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i];
                if (!('capCoords' in l))
                    continue;

                if (l.capDir == CapDir.ver) {
                    l.elem.style['-webkit-transform'] = 'rotate(-90deg)';
                    l.elem.style['-moz-transform'] = 'rotate(-90deg)';
                    l.elem.style['-ms-transform'] = 'rotate(-90deg)';
                    l.elem.style['-o-transform'] = 'rotate(-90deg)';
                    l.elem.style['filter'] =  
                            'progid:DXImageTransform.Microsoft.BasicImage(rotation=3)';
                }

                l.elem.style['top'] = l.capCoords.y + 'px';
                l.elem.style['left'] = l.capCoords.x + 'px';
            }
        }

        QUnit.test("getType_", function(assert) {
                var ret = getType_({'dia-pos': '12'});
                assert.ok(ret == Type.rect);

                assert.throws(function(){
                        getType_({'dia-line-start': '1'});
                    });

                var ret = getType_({'dia-line-start': '1', 'dia-line-end': '2'});
                assert.ok(ret == Type.line);

            });

        QUnit.test("rectSize_", function( assert ) {
                getTextSize_ = function() { return new Size(100, 40); }
                var ret = rectSize_({prop: 1.25});
                var exp = new Size(100, 80);
                assert.deepEqual(ret, exp);

                getTextSize_ = function() { return new Size(100, 40); }
                var ret = rectSize_({minSize: new Size(200, 50)});
                var exp = new Size(200, 50);
                assert.deepEqual(ret, exp);

                getTextSize_ = function() { return new Size(100, 40); }
                var ret = rectSize_({});
                var exp = new Size(100, 40);
                assert.deepEqual(ret, exp);

                getTextSize_ = function() { return new Size(100, 40); }
                var ret = rectSize_({minSize: new Size(80, 40)});
                var exp = new Size(100, 50);
                assert.deepEqual(ret, exp);

                getTextSize_ = function() { return new Size(100, 40); }
                var ret = rectSize_({minSize: new Size(200, 20)});
                var exp = new Size(400, 40);
                assert.deepEqual(ret, exp);

                getTextSize_ = function() { return new Size(20, 40); }
                var ret = rectSize_({minSize: new Size(200, 20)});
                var exp = new Size(400, 40);
                assert.deepEqual(ret, exp);

                getTextSize_ = function() { return new Size(200, 20); }
                var ret = rectSize_({minSize: new Size(20, 40)});
                var exp = new Size(200, 400);
                assert.deepEqual(ret, exp);

                getTextSize_ = function() { return new Size(20, 40); }
                var ret = rectSize_({prop: 1.5});
                var exp = new Size(60, 40);
                assert.deepEqual(ret, exp);

                getTextSize_ = function() { return new Size(200, 20); }
                var ret = rectSize_({prop: 0.5});
                var exp = new Size(200, 400);
                assert.deepEqual(ret, exp);

                getTextSize_ = function() { return new Size(200, 20); }
                var ret = rectSize_({prop: 10});
                var exp = new Size(200, 20);
                assert.deepEqual(ret, exp);
            });

        QUnit.test("getAttribs_", function( assert ) {
                var el = document.createElement('div')
                el.setAttribute('id', '11');
                el.setAttribute('dia-size', '29px:43px');
                var ret = getAttribs_(el);
                assert.deepEqual(ret, {'id': "11", 'dia-size': "29px:43px"});
            });

        QUnit.test("Block", function(assert) {
                var cfg = {gridSize: 10};
                var e = document.createElement('div')
                //UC1(1-7)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 
                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.minSize = {w: 30, h: 40});

                //UC2(8)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px', 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px',
                    'dia-coords': '100px:50px:20px'
                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });
                //UC3(9)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px', 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px',
                    'dia-coords': '-100px:50px'
                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });
                //UC4  (10)        
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px', 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px',
                    'dia-coords': '100px:50px'
                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });
                //UC5(11)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px', 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px:10px',
                    'dia-coords': '100px:50px'
                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });

                //UC6(12-19)

                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px', 
                    'dia-align': 'a1', 
                    'dia-size': '3:4',

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.prop = 0.75);
                assert.ok(b.minSize = {w: 30, h: 40});


                //UC7(20)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '3:-4', 
                    'dia-coords': '100px:50px'
                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });

                //UC8(21-28)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a2', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = '0');
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.minSize = {w: 30, h: 40});
                assert.ok(b.coords = {x: 100, y: 50});

                //UC9(29-36)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a3', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = -0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.minSize = {w: 30, h: 40});
                assert.ok(b.coords = {x: 100, y: 50});

                //UC10(37-44)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'b1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = '0');
                assert.ok(b.minSize = {w: 30, h: 40});
                assert.ok(b.coords = {x: 100, y: 50});


                //UC11(45-52)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'b2', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = '0');
                assert.ok(b.alignRel = '0');
                assert.ok(b.minSize = {w: 30, h: 40});
                assert.ok(b.coords = {x: 100, y: 50});

                //UC12(53-60)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'b3', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = -0.5);
                assert.ok(b.alignRel = '0');
                assert.ok(b.minSize = {w: 30, h: 40});
                assert.ok(b.coords = {x: 100, y: 50});

                //UC13(61-68)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'c1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = 0.5);
                assert.ok(b.minSize = {w: 30, h: 40});
                assert.ok(b.coords = {x: 100, y: 50});

                //UC14(69-76)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'c2', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = '0');
                assert.ok(b.alignRel = 0.5);
                assert.ok(b.minSize = {w: 30, h: 40});
                assert.ok(b.coords = {x: 100, y: 50});

                //UC15(77-84)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'c3', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = -0.5);
                assert.ok(b.alignRel = 0.5);
                assert.ok(b.minSize = {w: 30, h: 40});
                assert.ok(b.coords = {x: 100, y: 50});

                //UC16(85)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'aa1', 
                    'dia-size': '30px:40px', 

                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });

                //UC17(86)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a11', 
                    'dia-size': '30px:40px', 
                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });

                //UC18(87)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 
                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });

                //UC19(88-94)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: 1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.coords = {x: 100, y: 50});


                //UC20(95-101)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: -1, y: 0});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.coords = {x: 100, y: 50});


                //UC21(102-108)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 1, y: 0});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.coords = {x: 100, y: 50});

                //UC22(109-115)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: -1, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.coords = {x: 100, y: 50});


                //UC23(116-122)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 1, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.coords = {x: 100, y: 50});


                //UC24(123-129)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: -1, y: 1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.coords = {x: 100, y: 50});


                //UC25(130-136)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 1);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 1, y: 1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.coords = {x: 100, y: 50});

                //UC26(137)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+30' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });


                //UC27(138)
                var atribs = {
                    'dia-type': 'rectangle', 
                    'dia-pos': 'block4+n+0px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                assert.throws(function() {
                        new Block(cfg, atribs, e);
                    });


                //UC28(139-145)
                var atribs = {
                    'dia-type': 'ellipse', 
                    'dia-pos': 'block4+n+30px' , 
                    'dia-align': 'a1', 
                    'dia-size': '30px:40px', 

                };

                var b = new Block(cfg, atribs, e);
                assert.ok(b.type = 2);
                assert.ok(b.relId = 'block4');
                assert.ok(b.relPos = {x: 0, y: -1});
                assert.ok(b.relDist = 30);
                assert.ok(b.alignCur = 0.5);
                assert.ok(b.alignRel = -0.5);
                assert.ok(b.coords = {x: 100, y: 50});
            });

        QUnit.test("Line", function(assert) {
                var e = document.createElement('div')
                //UD1(1-13)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD2(14-26)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    //   'dia-line-style': 'solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = 1);
                assert.ok(b.lineColor = 'red');    


                //UD3(27-39)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = 2);
                assert.ok(b.lineColor = 'red');

                //UD4(40-52)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = 1);
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');



                //UD5(53-65)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = 2);
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD6(66-78)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 4);
                assert.ok(b.capDir = 1);
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD7(79-91)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 4);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD8(91-104)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 3);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD9(105-117)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 1);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD10(118-130)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = '0');
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD11(131-143)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': 1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');


                //UD12(144-156)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': -1, 'y': 0});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');


                //UD13(157-169)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 1, 'y': 0});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');


                //UD14(170-182)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': -1, 'y': -1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD15(183-195)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 1, 'y': -1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD16(196-208)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': -1, 'y': 1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD17(209-221)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = 2);
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 1, 'y': 1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = '0');
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'red');

                //UD18(222)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                };

                assert.throws(function() {
                        new Line(atribs, e);
                    });



                //UD19(223)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+nn+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                };

                assert.throws(function() {
                        new Line(atribs, e);
                    });


                //UD20(224)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+ololo', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                };

                assert.throws(function() {
                        new Line(atribs, e);
                    });

                //UD21(225)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'horver', 
                    'dia-text-pos': 'start',
                };

                assert.throws(function() {
                        new Line(atribs, e);
                    });

                //UD22(226)
                var atribs = {
                    'dia-line-start': 'block1+n+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': 'any red'
                };

                assert.throws(function() {
                        new Line(atribs, e);
                    });


                //UD23(227-239)
                var atribs = {
                    'dia-line-start': 'block1+n',
                    'dia-line-end': 'block2+n', 

                };

                var b = new Line(atribs, e);
                assert.ok(b.elem = 'null');
                assert.ok(b.domId = 'undefined');
                assert.ok(b.type = '0');
                assert.ok(b.startBlockId ='block1');
                assert.ok(b.startBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.startBlockShape = '0');
                assert.ok(b.endBlockId = 'block2');
                assert.ok(b.endBlockPos = {'x': 0, 'y': -1});
                assert.ok(b.endBlockShape = 2);
                assert.ok(b.capDir = '0');
                assert.ok(b.capPos = 1);
                assert.ok(b.lineStyle = '0');
                assert.ok(b.lineColor = 'black');


                //UD24(240)
                var atribs = {
                    'dia-line-start': 'block1',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                };

                assert.throws(function() {
                        new Line(atribs, e);
                    });
                //UD25(241)
                var atribs = {
                    'dia-line-start': 'block1+nn+rhombus',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                };

                assert.throws(function() {
                        new Line(atribs, e);
                    });

                //UD26(242)
                var atribs = {
                    'dia-line-start': 'block1+n+ololo',
                    'dia-line-end': 'block2+n+rhombus', 
                    'dia-direction': 'hor', 
                    'dia-text-pos': 'start',
                    'dia-line-style': '1px solid red'
                };

                assert.throws(function() {
                        new Line(atribs, e);
                    });
            });

        QUnit.test("rectSize_", function(assert) {
                var cfg = {gridSize: 10};

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {prop: 1.25};
                var s = rectSize_(block);

                assert.equal(s.w, 100);
                assert.equal(s.h, 80);

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {minSize: {w: 200, h: 50}};
                var s = rectSize_(block);

                assert.equal(s.w, 200);
                assert.equal(s.h, 50);

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {};
                var s = rectSize_(block);

                assert.equal(s.w, 100);
                assert.equal(s.h, 40);

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {minSize: {w: 80, h:40}};
                var s = rectSize_(block);

                assert.equal(s.w, 100);
                
                assert.equal(s.h, 50);

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {minSize: {w: 200, h: 20}};
                var s = rectSize_(block);

                assert.equal(s.w, 400);
                assert.equal(s.h, 40);

                getTextSize_ = function() { return new Size(20, 40); };
                var block = {minSize: {w: 200, h: 20}};
                var s = rectSize_(block);
                
                assert.equal(s.w, 400);
                assert.equal(s.h, 40);

                getTextSize_ = function() { return new Size(200, 20); };
                var block = {minSize: {w: 20, h: 40}};
                var s = rectSize_(block);

                assert.equal(s.w, 200);
                assert.equal(s.h, 400);

                getTextSize_ = function() { return new Size(20, 40); };
                var block = {prop: 1.25};
                var s = rectSize_(block);
                
                assert.equal(s.w, 50);
                assert.equal(s.h, 40);

                getTextSize_ = function() { return new Size(200, 20); };
                var block = {prop: 0.5};
                var s = rectSize_(block);
                
                assert.equal(s.w, 200);
                assert.equal(s.h, 400);

                getTextSize_ = function() { return new Size(200, 20); };
                var block = {prop: 10};
                var s = rectSize_(block);
                
                assert.equal(s.w, 200);
                assert.equal(s.h, 20);
             
            });

        QUnit.test("ellipseSize", function(assert) {
                var cfg = {gridSize: 10};

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {prop: 1.25};
                var s = rectSize_(block);

                assert.equal(s.w, 100);
                assert.equal(s.h, 80);

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {minSize: {w: 200, h: 60}};
                var s = rectSize_(block);

                assert.equal(s.w, 200);
                assert.equal(s.h, 60);

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {block: 3};
                var s = rectSize_(block);

                assert.equal(s.w, 100);
                assert.equal(s.h, 40);
            });



        QUnit.test("ellipseSize", function(assert) {
                var cfg = {gridSize: 10};

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {prop: 1.25};
                var s = rectSize_(block);

                assert.equal(s.w, 100);
                assert.equal(s.h, 80);

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {minSize: {w: 200, h: 60}}; var s = rectSize_(block);

                assert.equal(s.w, 200);
                assert.equal(s.h, 60);

                getTextSize_ = function() { return new Size(100, 40); };
                var block = {block: 3};
                var s = rectSize_(block);

                assert.equal(s.w, 100);
                assert.equal(s.h, 40);
            });

        QUnit.test("blocksRelPos_", function(assert) {
                var cfg = {gridSize: 10};

                var blocks = [
                    {id: 0, size: {w: 30, h:20}},
                    {id: 1, relId: 0, size: {w: 20, h:20}, relDist: 10, relPos: {x: 0, y: -1}, alignCur: -0.5, alignRel: -0.5}, 
                    {id: 2, relId: 0, size: {w: 10, h:10}, relDist: 10, relPos: {x: 0, y: 1}, alignCur: 0, alignRel: 0}
                ];

                blocksRelPos_(cfg, blocks);
                assert.deepEqual(blocks[0].coords, new Point(0, 0));
                assert.deepEqual(blocks[1].coords, new Point(-25, -30));
                assert.deepEqual(blocks[2].coords, new Point(0, 25));
            });

        QUnit.test("blocksAbsPos_", function(assert) {
                var cfg = {gridSize: 10};

                var blocks = [
                    {size: {w: 10, h:10}, coords: {x: -20, y: -30}},
                    {size: {w: 10, h:10}, coords: {x: 0, y: 0}}, 
                    {size: {w: 10, h:10}, coords: {x: 30, y: 60}},
                ];

                blocksAbsPos_(cfg, blocks);
                assert.deepEqual(blocks[0].coords, {x:25, y:25});
                assert.deepEqual(blocks[1].coords, {x:45, y:55});
                assert.deepEqual(blocks[2].coords, {x:75, y:115});
            });

        QUnit.test("fillGrid_", function(assert) {
                var blocks = [
                    {size: {w: 60, h: 80}, coords: {x: 70, y: 80}},
                    {size: {w: 20, h: 80}, coords: {x: 160, y: 110}},
                ];

                var cfg = {gridSize: 20, imgSize: new Size(220, 180)};
                var grid = new Grid(cfg, blocks);

                fillGrid_(grid, blocks);

                var g = [
                    [ false, false, false, false, false, false, false, false, false, false, false, false ],
                    [ false, true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  false ],
                    [ false, true,  false, false, false, false, true,  true,  true,  true,  true,  false ],
                    [ false, true,  false, false, false, false, true,  true,  true,  true,  true,  false ],
                    [ false, true,  false, false, false, false, true,  true,  false, true,  true,  false ],
                    [ false, true,  false, false, false, false, true,  true,  false, true,  true,  false ],
                    [ false, true,  false, false, false, false, true,  true,  false, true,  true,  false ],
                    [ false, true,  true,  true,  true,  true,  true,  true,  false, true,  true,  false ],
                    [ false, true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  false ],
                    [ false, false, false, false, false, false, false, false, false, false, false, false ],
                ];

                assert.deepEqual(grid.g, g);
            });


        QUnit.test("bfs_", function(assert) {
                var blocks = [
                    {size: {w: 60, h: 80}, coords: {x: 70, y: 80}},
                    {size: {w: 20, h: 80}, coords: {x: 160, y: 110}},
                ];

                var cfg = {gridSize: 20, imgSize: new Size(220, 180)};
                var grid = new Grid(cfg, blocks);

                fillGrid_(grid, blocks);

                var path = bfs_(grid, new Point(2,4), new Point(8,8));


                var exp = new Array();
                exp[104] = 103;
                exp[103] = 91;
                exp[91] = 90;
                exp[90] = 89;
                exp[89] = 88;
                exp[88] = 87;
                exp[87] = 86;
                exp[86] = 85;
                exp[85] = 73;
                exp[73] = 61;
                exp[61] = 49;
                exp[49] = 50;
                exp[50] = 50;

                for (var i = 0; i < exp.length; i++) {
                    if (exp[i] == null)
                        continue;

                    assert.deepEqual(path[i], exp[i]);
                };

                var path = bfs_(grid, new Point(2, 6), new Point(4, 3));
                assert.equal(path, null);
            });

        QUnit.test("restorePath_", function(assert) {
                var blocks = [
                    {size: {w: 60, h: 80}, coords: {x: 70, y: 80}},
                    {size: {w: 20, h: 80}, coords: {x: 160, y: 110}},
                ];

                var cfg = {gridSize: 20, imgSize: new Size(220, 180)};
                var grid = new Grid(cfg, blocks);

                fillGrid_(grid, blocks);
                var st = new Point(2,4);
                var en = new Point(8,8);
                var p = bfs_(grid, st, en);

                var path = restorePath_(grid, p, st, en);

                var exp = [
                    {x: 40, y: 80},
                    {x: 20, y: 80},
                    {x: 20, y: 140},
                    {x: 140, y: 140},
                    {x: 140, y: 160},
                    {x: 160, y: 160},
                ];

                for (var i = 0; i < exp.length; i++) {
                    if (exp[i] == null)
                        continue;

                    assert.deepEqual(path[i].x, exp[i].x);
                    assert.deepEqual(path[i].y, exp[i].y);
                };
            });

        QUnit.test("draw", function(assert) {
                assert.throws(function(){
                        draw('asda');

                    });
            });

        QUnit.test("checkIdScope_", function(assert) {
                var blocks = [{domId: 'bl1'}, {domId: 'bl2', relId: 'bl1'}]; 
                var lines = [{startBlockId: 'bl1', endBlockId: 'bl2'}];

                var epB = [{domId:'bl1', id: 0}, {domId: 'bl2', id: 1, relId: 0}];
                var epL = [{startBlockId: 0, endBlockId: 1}];

                checkIdScope_(blocks, lines);
                assert.deepEqual(blocks, epB);
                assert.deepEqual(lines, epL);

                var blocks = [{id: 'bl1'}, {id: 'bl2', relId: 'bl3'}];
                assert.throws(function(){
                        checkIdScope_(blocks, []);
                    });
            });

        QUnit.test("checkOverlaps_", function(assert) {
                var cfg = {gridSize: 10};
                //1
                var blocks = [
                    {id: 0, coords: {x: 100, y: 100}, size: {w: 50, h: 50}, domId: 'block1'}
                ];

                try {
                    checkOverlaps_(cfg, blocks);
                } catch (e) {
                    assert.ok(1 == 0);
                }
                //2
                var blocks = [
                    {id: 0, coords: {x: 50,  y: 50},  size: {w: 30, h: 20}, domId: 'block1'},
                    {id: 1, coords: {x: 200, y: 200}, size: {w: 60, h: 20}, domId: 'block2'},
                ];

                try {
                    checkOverlaps_(cfg, blocks);
                } catch (e) {
                    assert.ok(1 == 0);
                }
                //3
                var blocks = [
                    {id: 0, coords: {x: 100, y: 100}, size: {w: 50, h: 50}, domId: 'block1'},
                    {id: 1, coords: {x: 100, y: 100}, size: {w: 50, h: 50}, domId: 'block2'},
                ];
                assert.throws(function() {
                        checkOverlaps_(cfg, blocks);
                    });
                //4
                var blocks = [
                    {id: 0,  coords: {x: 200, y: 200}, size: {w: 100, h: 100}, domId: 'block1'},
                    {id: 1,  coords: {x: 400, y: 200}, size: {w: 100, h: 100}, domId: 'block2'},
                ];
                assert.throws(function() {
                        checkOverlaps_(cfg, blocks);
                    });

                //5
                var blocks = [
                    {id: 0,  coords: {x: 100, y: 100}, size: {w: 50, h: 50}, domId: 'block1'},
                    {id: 1,  coords: {x: 125, y: 300}, size: {w: 50, h: 50}, domId: 'block2'},
                ];

                try {
                    checkOverlaps_(cfg, blocks);
                } catch (e) {
                    assert.ok(1 == 0);
                }
                //6
                var blocks = [
                    {id: 0,  coords: {x: 100}, size: {w: 50, h: 50}, domId: 'block1'},
                    {id: 1,  coords: {x: 125, y: 300}, size: {w: 50, h: 50}, domId: 'block2'},
                ];

                try {
                    checkOverlaps_(cfg, blocks);
                } catch (e) {
                    assert.ok(1 == 0);
                }
                //7(3)
                var blocks = [
                    {id: 0,  coords: {x: 100, y: 100}, domId: 'block1'},
                    {id: 1,  coords: {x: 200, y: 300}, size: {w: 50, h: 50}, domId: 'block2'},
                ];

                try {
                    checkOverlaps_(cfg, blocks);
                } catch (e) {
                    assert.ok(1 == 1);
                }
                //8(4)
                var blocks = [
                    {id: 0},
                    {id: 1,  coords: {x: 200, y: 300}, size: {w: 50, h: 50}, domId: 'block2'},
                ];

                try {
                    checkOverlaps_(cfg, blocks);
                } catch (e) {
                    assert.ok(1 == 1);
                }

                //9
                var blocks = [
                    {id: 0,  coords: {x: 100, y: 100}, size: {w: 50, h: 50}, domId: 'block1'},
                    {id: 1,  coords: {x: 115, y: 110}, size: {w: 50, h: 50}, domId: 'block2'},
                ];
                assert.throws(function() {
                        checkOverlaps_(cfg, blocks);
                    });
            });

        return pub;
    }());
