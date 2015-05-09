var dia = (function() { 
        var pub = {};

        var cfg = {};

        var type = { line: 0, rect: 1, ellipse: 2 };
        var lineEndShape = { none: 0, angle: 1, rhombus: 2, circle: 3, triangle: 4 };
        var capDir = { hor: 0, ver: 1 };
        var capPos = { start: 0, center: 1, end: 2 };
        var lineStyle = { solid: 0, dotted: 1, dashed: 2 };

        var blocks = [];
        var lines = [];

        function point(x, y) {
            this.x = x;
            this.y = y;
        }

        function size(w, h) {
            this.w = w;
            this.h = h;
        }

        function isNum(str) {
            return str.match(/^\d+$/);
        }

        pub.draw = function(diaId) {
            cfg.elem = $('#' + diaId);

            try {
                parseDescr_();
            } catch (e) {
                console.log('#' + diaId + ': ' + e);
            }

            for (var i = 0; i < blocks.length; i++)
                console.log(blocks[i]);
            for (var i = 0; i < lines.length; i++)
                console.log(lines[i]);
        };

        function setDivDefaultCSS(elem) {
            $(elem).css({'position': 'absolute'});
            $(elem).css({'height': 'auto'});
            $(elem).css({'width': 'auto'});
            $(elem).css({'white-space': 'nowrap'});
            $(elem).css({'word-wrap': 'break-word'});
        }

        function parseDescr_() {
            cfg.elem.children().each(function(id, e) {
                    try {
                        setDivDefaultCSS(e);
                        var attribs = getAttribs_(e);
                        var t = getType_(attribs);

                        if (t != type.line) {
                            var b = new block(attribs, e);
                            blocks.push(b);
                        } else {
                            var l = new line(attribs, e);
                            lines.push(l);
                        }
                    } catch (str) {
                        throw '#' + attribs.id + ': ' + str;
                    }
                });

            try {
                checkIdScope();
            } catch (e) {
                throw e;
            }
        };

        function getAttribs_(elem) {
            var rc = {};
            $(elem.attributes).each(function() {
                    var name = this.nodeName.toLowerCase();
                    if (name != 'id')
                        rc[name] = this.nodeValue.toLowerCase();
                    else
                        rc[name] = this.nodeValue;
                });

            return rc;
        }

        function getType_(attribs) {
            if (('dia-line-start' in attribs) && ('dia-line-end' in attribs))
                return type.line;

            if (attribs['dia-type'] == 'line')
                return type.line;

            var hasPos = ('dia-pos' in attribs);
            var hasPivot = ('hasPivot' in getType_);

            if (hasPos || !hasPivot) {
                if (!hasPos)
                    getType_.hasPivot = true;

                if (!('dia-type' in attribs))
                    return type.rect;

                if (attribs['dia-type'] == 'rectangle')
                    return type.rect;
                if (attribs['dia-type'] == 'ellipse')
                    return type.ellipse;

                throw 'Unknown "dia-type" value';
            } 

            throw 'No required attributes specified';
        }

        function block(attribs, e) {
            this.elem = e;
            this.relDist = 20;
            this.alignCur = 0;
            this.alignRel = 0;

            this.type = type.rect;
            if (attribs['dia-type'] == 'ellipse')
                this.type = type.ellipse;

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
                var cur;
                switch (attribs['dia-align'][0]) {
                case 'a': cur = -0.5; break;
                case 'b': cur = 0; break;
                case 'c': cur = 0.5; break;
                default: throw 'Incorrect "dia-align" value';
                }

                var rel;
                switch (attribs['dia-align'][1]) {
                case '1': rel = 0.5; break;
                case '2': rel = 0; break;
                case '3': rel = -0.5; break;
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
                } else if (isNum(a[0]) && isNum(a[1]) && w > 0 && h > 0) {
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

            if (this.type == type.rect) {
                this.size = rectSize_(this);
            } else if (this.type == type.ellipse) {
                this.size = ellipseSize_(this);
            }
        }

        function line(attribs, e) {
            this.elem = e;
            this.startBlockShape = lineEndShape.none;
            this.endBlockShape = lineEndShape.none;
            this.capPos = capPos.center;
            this.capDir = capDir.hor;
            this.lineWidth = 1;
            this.lineStyle = lineStyle.solid;
            this.lineColor = "black";
            this.domId = attribs['id'];

            function lineEnd(str) {
                var rc = {};
                var a = str.split('+');

                if (a.length < 2)
                    throw '';

                rc['id'] = a[0];

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
                rc['pos'] = pos;

                var sh;
                switch (a[2]) {
                case 'none': sh = lineEndShape.none; break;
                case 'angle': sh = lineEndShape.angle; break;
                case 'rhombus': sh = lineEndShape.rhombus; break;
                case 'circle': sh = lineEndShape.circle; break;
                case 'triangle': sh = lineEndShape.triangle; break;
                case undefined: sh = null; break;
                default: throw 'end style';
                }
                rc['sh'] = sh;

                return rc;
            }

            try {
                var s = lineEnd(attribs['dia-line-start']);
                this.startBlockId = s.id;
                this.startBlockPos = s.pos;
                if (s.sh != null)
                    this.startBlockShape = s.sh;
            } catch (s) {
                throw 'Incorrect "dia-line-start" value' + s;
            }

            try {
                var e = lineEnd(attribs['dia-line-end']);
                this.startBlockId = e.id;
                this.startBlockPos = e.pos;
                if (e.sh != null)
                    this.startBlockShape = e.sh;
            } catch (s) {
                throw 'Incorrect "dia-line-end" value' + s;
            }


            switch (attribs['dia-direction']) {
            case 'hor': this.capDir = capDir.hor; break;
            case 'ver': this.capDir = capDir.ver; break;
            case undefined: break;
            default: throw 'Incorrect "dia-direction" value';
            }

            switch (attribs['dia-text-pos']) {
            case 'center': this.capPos = capPos.center; break;
            case 'start': this.capPos = capPos.start; break;
            case 'end': this.capPos = capPos.end; break;
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
                    case 'solid': this.lineStyle = lineStyle.solid; break;
                    case 'dotter': this.lineStyle = lineStyle.dotted; break;
                    case 'dashed': this.lineStyle = lineStyle.dashed; break;
                    default: throw 'Incorrect "dia-line-style" value';
                    }
                }

                if (a.length > 2) {
                    this.lineColor = a[2];
                }
            }
        }

        function checkIdScope() {
            for (var i = 0; i < blocks.length; i++) {
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

                blocks[i].id = i;
            };

            for (var i = 0; i < blocks.length; i++) {
                if (typeof (blocks[i].relId) != 'number')
                    throw blocks[i].domId + ': #' + blocks[i].relId + ' doesn\'t belong to diagram';
            }

            for (var i = 0; i < lines.length; i++) {
                if (typeof (lines[i].startBlockId) != 'number')
                    throw line[i].domId + ': id #' + lines[i].startBlockId + ' doesn\'t belong to diagram';
                if (typeof (lines[i].endBlockId) != 'number')
                    throw line[i].domId + ': id #' + lines[i].endBlockId + ' doesn\'t belong to diagram';
            }
        }

        function getTextSize_(elem) {
            var w = (elem.clientWidth + 1);
            var h = (elem.clientHeight + 1);
            return new size(w, h);
        }

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

        function ellipseSize_(block) {
            var text = getTextSize_(block.elem);

            if (block.prop == undefined && block.minSize == undefined)
                return new size(Math.sqrt(2) * text.w, Math.sqrt(2) * text.h);

            if (block.minSize != null) {
                if (Math.sqrt(2) * text.w < block.minSize.w && Math.sqrt(2) * text.h < block.minSize.h)
                    return block.minSize;

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

        return pub;
}());
