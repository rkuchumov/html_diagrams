var dia = (function() { 
        var pub = {};

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
         * @return {size} element's content size
         */
        function getTextSize_(elem) {
            var w = (elem.clientWidth + 1);
            var h = (elem.clientHeight + 1);
            return new size(w, h);
        }

        /** Fetches attributes names and values of specified element and 
         * returns them in lower case
         * @param {Element} elem DOM object to extract atrributes from
         * @return {Object<String, String>} atrributes' names and values in lowercase
         */
        function getAttribs_(elem) {
            var attr = {};
            $(elem.attributes).each(function() {
                    var name = this.nodeName.toLowerCase();
                    attr[name] = this.nodeValue.toLowerCase();
                });

            return attr;
        }

        /** Creates an instance of 2d point
         *
         * @constructor
         * @param {Number} x first coordinate
         * @param {Number} y second coordinate
         */
        function point(x, y) {
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
             * @param {point} another point
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
        function size(w, h) {
            this.w = w;
            this.h = h;
        }

        /** Creates an instance of diagram config object. 
         * @param {Element} elem DOM object containing diagram discription
         * @property {Number} gridSize distance between grid's node. which is
         * used for calculating line's positions
         * @property {Number} capOffset caption offset from block and
         * corresponding line
         * @property {Number} id diagram discription id in DOM
         * @propery {size} imgSize diagram size. Can be calculated after
         * blocks' positions are calulated 
         * @throws {String} Error message on incorrect attributes values
         */
        function Config(elem) {
            this.elem = elem;
            this.gridSize = 10;
            this.capOffset = 2;

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
            try {
                var cfg = new Config($('#' + id)[0]);

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
            $(elem).css({'position': 'absolute'});
            $(elem).css({'height': 'auto'});
            $(elem).css({'width': 'auto'});
            $(elem).css({'white-space': 'nowrap'});
            $(elem).css({'word-wrap': 'break-word'});
            $(elem).css({'text-align': 'center'});
        }

        /** Travels diagram's child objects(DOM) and creates line or block instance 
         * for each object. 
         * @param {Config} cfg diagram config instance
         * @throws {String} error message (parsing error or out-of-scope id error)
         * @return {{blocks: Array.<Block>, lines: Array.<Line>}} Block and lines arrays
         */
        function parseDescr_(cfg) {
            var blocks = [];
            var lines = [];
            $(cfg.elem).children().each(function(id, e) {
                    try {
                        setDivDefaultCSS_(e);

                        var attribs = getAttribs_(e);
                        delete getType_.hasPivot;
                        var t = getType_(attribs);

                        if (t != Type.line) {
                            blocks.push(new Block(attribs, e));
                        } else {
                            lines.push(new Line(attribs, e));
                        }
                    } catch(str) {
                        throw '#' + attribs.id + ': ' + str;
                    }
                });

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
         * position found
         */
        function getType_(attribs) {
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
         * @property {point} relPos position of this block relative to relId block
         * @property {size} size calculated block's size
         * @property {coords} block's absolute position
         * @proprty {Number} relId id of a block used for relative postioning 
         * and aligment 
         * @proprty {Number} prop proportions (width / height)
         * @throws {String} an error message if unable to parse attribute's value
         */
        function Block(attribs, e) {
            this.elem = e;
            this.relDist = 20;
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
                case 'n':  pos = new point( 0, -1); break;
                case 's':  pos = new point( 0,  1); break;
                case 'w':  pos = new point(-1,  0); break;
                case 'e':  pos = new point( 1,  0); break;
                case 'nw': pos = new point(-1, -1); break;
                case 'ne': pos = new point( 1, -1); break;
                case 'sw': pos = new point(-1,  1); break;
                case 'se': pos = new point( 1,  1); break;
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
                    this.minSize = new size(w, h);
                } else if (isNum_(a[0]) && isNum_(a[1]) && w > 0 && h > 0) {
                    this.prop = w / h;
                } else {
                    throw 'Incorrect "dia-size" value';
                }
            }

            if ('dia-coords' in attribs) {
                var a = attribs['dia-coords'].split(':');

                if (a.length != 2)
                    throw 'Incorrect "dia-coords" value';

                var x = parseInt(a[0]);
                var y = parseInt(a[1]);

                if (a[0].substr(-2) == 'px' && a[1].substr(-2) == 'px' && x > 0 && y > 0) {
                    this.coords = new point(x, y);
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
         * @property {lineStyle} [lineStyle=LineStyle.solid] line style
         * @property {String} [lineColor='black'] line color
         * @property {String} domId id of DOM element describing this line
         * @throws {String} an error message if unable to parse attribute's value
         */
        function Line(attribs, e) {
            this.elem = e;
            this.startStyle = LineEnd.none;
            this.endStyle = LineEnd.none;
            this.capPos = CapPos.center;
            this.capDir = CapDir.hor;
            this.lineWidth = 1;
            this.lineStyle = LineStyle.solid;
            this.lineColor = "black";
            this.domId = attribs['id'];

            /** Parses values of 'dia-line-start' or 'dia-line-end' attributes
             * @param {String} attribute value
             * @return {Object} ret parsed value
             * @return {String} ret.id id of an end block
             * @return {point} ret.pos line's end position 
             * @return {LineEnd} ret.sh line's end style
             * @throws {String} an error message if unable to parse attribute's value
             */
            function lineEnd_(str) {
                var ret = {};
                var a = str.split('+');

                if (a.length < 2)
                    throw '';

                ret['id'] = a[0];

                var pos;
                switch (a[1]) {
                case 'n':  pos = new point( 0, -1); break;
                case 's':  pos = new point( 0,  1); break;
                case 'w':  pos = new point(-1,  0); break;
                case 'e':  pos = new point( 1,  0); break;
                case 'nw': pos = new point(-1, -1); break;
                case 'ne': pos = new point( 1, -1); break;
                case 'sw': pos = new point(-1,  1); break;
                case 'se': pos = new point( 1,  1); break;
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
                throw 'Incorrect "dia-line-start" value' + s;
            }

            try {
                var e = lineEnd_(attribs['dia-line-end']);
                this.endBlockId = e.id;
                this.endBlockPos = e.pos;
                if (e.sh != null)
                    this.endStyle = e.sh;
            } catch (s) {
                throw 'Incorrect "dia-line-end" value' + s;
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
                    case 'dotter': this.lineStyle = LineStyle.dotted; break;
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
            for (var i = 0; i < blocks.length; i++) {
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
         *
         * @param {Block} block block
         * @return {size} size  
         */
        function rectSize_(block) {
            var text = getTextSize_(block.elem);

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

            var tp = text.w / text.h;
            if (tp > 1 && p < 1 || p < tp)
                return new size(text.w, text.w / p);
            if (tp < 1 && p > 1 || p > tp)
                return new size(text.h * p, text.h);
        }

        /** Calculates ellipse block size. The size is calculated 
         * according to block's proportions or min. size and is greater 
         * than the size of block's text
         *
         * @param {Block} block block
         * @return {size} size  
         */
        function ellipseSize_(block) {
            var text = getTextSize_(block.elem);

            if (block.prop == undefined && block.minSize == undefined)
                return new size(Math.sqrt(2) * text.w, Math.sqrt(2) * text.h);

            if (block.minSize != null) {
                if (Math.sqrt(2) * text.w < block.minSize.w
                    && Math.sqrt(2) * text.h < block.minSize.h) 
                {
                    return block.minSize;
                }

                return new size(Math.sqrt(2) * text.w, Math.sqrt(2) * text.h);
            }

            var tp = text.w / text.h;
            var s;
            if (tp > 1 && p < 1 || p < tp)
                s = new size(text.w, text.w / p);
            if (tp < 1 && p > 1 || p > tp)
                s = new size(text.h * p, text.h);

            s.w *= Math.sqrt(2);
            s.h *= Math.sqrt(2);
            return s;
        }

        /** Caclulates image size and blocks' absolute positions
         * @throws {String} Error message if there are blocks overlaping 
         * each other
         */
        function blocksPos_(cfg, blocks) {
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
            for (var i = 0; i < blocks.length; i++) {
                if (blocks[i].relId !== undefined)
                    continue;

                var t = blocks[0];
                blocks[0] = blocks[i];
                blocks[i] = t;
                break;
            } 

            blocks[0].coords = new point(0, 0);

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

                    blocks[j].coords = new point(x, y);
                }
            }
        }

        /** Caclulates blocks positions relative to the image top left corner.
         * Sets image size.
         */
        function blocksAbsPos_(cfg, blocks) {
            // top left and bottom right image coordinates relative to the 
            // first block
            var left = Number.MAX_VALUE;
            var right = -Number.MAX_VALUE;
            var top_ = Number.MAX_VALUE;
            var bottom = -Number.MAX_VALUE;
            $.each(blocks, function(i, block) {
                    var l = block.coords.x - block.size.w / 2;
                    if (l < left) left = l;

                    var r = block.coords.x + block.size.w / 2;
                    if (r > right) right = r;

                    var t = block.coords.y - block.size.h / 2;
                    if (t < top_) top_ = t;

                    var b = block.coords.y + block.size.h / 2;
                    if (b > bottom) bottom = b;
                });

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
            cfg.imgSize = new size(w, h);

            $.each(blocks, function(i, block) {
                    block.coords.x += -left;
                    block.coords.y += -top_;
                });
        }

        /** Checks if there is two blocks overlapping each other
         *
         * @throws {String} Error message if there are blocks overlaping
         */
        function checkOverlaps_(cfg, blocks) {
            for (var i = 0; i < blocks.length; i++) { 
                for (var j = i + 1; j < blocks.length; j++) { 
                    var x1 = blocks[i].coords.x;
                    var y1 = blocks[i].coords.y;
                    var x2 = blocks[j].coords.x;
                    var y2 = blocks[j].coords.y;

                    var w = 2 * cfg.gridSize + (blocks[i].size.w + blocks[j].size.w) / 2;
                    var h = 2 * cfg.gridSize + (blocks[i].size.h + blocks[j].size.h) / 2;

                    if ((Math.abs(x1 - x2) < w) && (Math.abs(y1 - y2) < h))
                        throw "#" + blocks[i].domId + " overlaps #" + blocks[j].domId;
                }
            }
        }

        /* Draws blocks by setting CSS values to resp. DOM elements
         */
        function drawBlocks_(cfg, blocks) {
            $(cfg.elem).css({'width': cfg.imgSize.w});
            $(cfg.elem).css({'height': cfg.imgSize.h});
            $(cfg.elem).css({'position': 'relative'});

            $.each(blocks, function(i, block) {
                    var top_ = block.coords.y - block.size.h / 2;
                    var left = block.coords.x - block.size.w / 2;

                    $(block.elem).css({'top': top_});
                    $(block.elem).css({'left': left});
                    $(block.elem).css({'width': block.size.w});
                    $(block.elem).css({'height': block.size.h});

                    if (block.type == Type.ellipse) {
                        var r = (block.size.w / 2) + "px/" + (block.size.h / 2) + "px";
                        $(block.elem).css({'-moz-border-radius': r});
                        $(block.elem).css({'-webkit-border-radius': r});
                        $(block.elem).css({'border-radius': r});
                    }

                    $(block.elem).wrapInner('<span></span>');
                    $(block.elem).children(':first').css({'display': 'table-cell'});
                    $(block.elem).children(':first').css({'vertical-align': 'middle'});
                    $(block.elem).children(':first').css({'height': block.size.h});
                    $(block.elem).children(':first').css({'width': block.size.w});
                });
        }

        function findBlock_(blocks, id) {
            for (var i = 0; i < blocks.length; i++) {
                if (blocks[i].id == id)
                    return blocks[i];
            }
            return undefined;
        }

        function linesPos_(cfg, blocks, lines) {
            var g = new grid(cfg, blocks);
            fillGrid_(g, blocks);
            
            $.each(lines, function(i, line) {
                    // XXX 
                    var s = findBlock_(blocks, line.startBlockId);
                    var stX = s.coords.x + 0.5 * s.size.w * line.startBlockPos.x;
                    var stY = s.coords.y + 0.5 * s.size.h * line.startBlockPos.y;
                    var start = new point(Math.round(stX / g.h), Math.round(stY / g.h));

                    var e = findBlock_(blocks, line.endBlockId);
                    var enX = e.coords.x + 0.5 * e.size.w * line.endBlockPos.x;
                    var enY = e.coords.y + 0.5 * e.size.h * line.endBlockPos.y;
                    var end = new point(Math.round(enX / g.h), Math.round(enY / g.h));

                    line.points = findPath(g, start, end);
                });
        }

        function grid(cfg) {
            this.h = cfg.gridSize;
            this.n = cfg.imgSize.w / this.h + 1;
            this.m = cfg.imgSize.h / this.h + 1;

            var g = new Array(this.m);
            for (var j = 0; j < this.m; j++)
                g[j] = new Array(this.n);

            this.empty = function(x, y) {
                if (arguments.length == 1) {
                    return g[x.y][x.x] == true;
                } else if (arguments.length == 2) {
                    return g[y][x] == true;
                }
                return undefined;
            }

            this.setEmpty = function(x, y, val) {
                if (arguments.length == 2) {
                    g[x.y][x.x] = y;
                } else if (arguments.length == 3) {
                    g[y][x] = val;
                }
                return undefined;
            }

            this.id = function(node) {
                return node.y * this.n + node.x;
            }

            this.node = function(id) {
                var y = Math.floor(id / this.n);
                var x = id % this.n;
                return new point(x, y);
            }
        }

        function fillGrid_(grid, blocks) {
            for (var j = 0; j < grid.m; j++)
                for (var i = 0; i < grid.n; i++)
                    grid.setEmpty(i, j, true);

            $.each(blocks, function(i, block) {
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
                });

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
            grid.setEmpty(end, true);

            var parents = bfs(grid, start, end);
            if (parents == null)
                return null;

            return restorePath_(grid, parents, start, end);
        }

        function bfs(grid, start, end) {
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
                    var v = new point(u.x + dx[d], u.y + dy[d]);
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
            var prev = end;
            var cur = grid.node(path[grid.id(prev)]);

            var p = [];
            p.push(new point(prev.x * grid.h, prev.y * grid.h));

            var prevDir = (prev.x == cur.x) ? 1 : 0;

            while (grid.id(cur) != grid.id(start)) {
                prev = cur;
                var cur = grid.node(path[grid.id(prev)]);

                if (grid.id(cur) == grid.id(prev))
                    break;

                var curDir = (prev.x == cur.x) ? 1 : 0;
                if (prevDir != curDir)
                    p.push(new point(prev.x * grid.h, prev.y * grid.h));
                prevDir = curDir;
            }
            p.push(new point(cur.x * grid.h, cur.y * grid.h));

            p.reverse();

            return p; 
        }

        function drawLines_(cfg, lines) {
            var id = cfg.id + 'Canvas';
            var can = '<canvas ' + 
                'id="' + id + '" ' + 
                'width="' + cfg.imgSize.w + '" ' +
                'height="' + cfg.imgSize.h + '">' +
                'Your browser does not support the HTML5 canvas tag.' + 
                '</canvas>';

            $(cfg.elem).append(can);

            var ctx = document.getElementById(id).getContext("2d");

            $.each(lines, function(i, line) {
                    ctx.beginPath();
                    // ctx.strokeStyle = '#f0f';
                    ctx.lineWidth = line.lineWidth;
                    
                    var prev = line.points[0];
                    ctx.moveTo(prev.x, prev.y);
                    var cur = line.points[1];
                    ctx.lineTo(cur.x, cur.y);

                    for (var j = 2; j < line.points.length; j++) {
                        prev = cur;
                        cur = line.points[j];

                        ctx.moveTo(prev.x, prev.y);
                        ctx.lineTo(cur.x, cur.y);
                    }
                    ctx.stroke();
                });
        }

        function caprionPos_(cfg, line) {
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

                p = new point();
                $.extend(p, line.points[s - 1]);
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
                text = new size(text.h, text.w);
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

            line.capCoords = new point(x, y);
        }

        function captionsPos_(cfg, lines) {
            $.each(lines, function(i, line) {
                    if (!$(line.elem).is(':empty'))
                        caprionPos_(cfg, line);
                });
        }

        function drawCaptions_(cfg, lines) {
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i];
                if (!('capCoords' in l))
                    continue;

                if (l.capDir == CapDir.ver) {
                    $(l.elem).css({'-webkit-transform': 'rotate(-90deg)'});
                    $(l.elem).css({'-moz-transform': 'rotate(-90deg)'});
                    $(l.elem).css({'-ms-transform': 'rotate(-90deg)'});
                    $(l.elem).css({'-o-transform': 'rotate(-90deg)'});
                    $(l.elem).css({'filter': 'progid:DXImageTransform.Microsoft.BasicImage(rotation=3)'});
                }

                $(l.elem).css({'top': l.capCoords.y});
                $(l.elem).css({'left': l.capCoords.x});
            }
        }

        return pub;
}());
