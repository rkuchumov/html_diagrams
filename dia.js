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

        pub.draw = function(diaId) {
            cfg.elem = $('#' + diaId);

            parseDescr_();
        };

        function parseDescr_() {
            cfg.elem.children().each(function(id, e) {
                    var attribs = getAttribs_(e);
                    var t = getType(attribs);

                    if (t != type.line) {
                        var b = new block(attribs);
                        b.elem = e;
                        blocks.push(b);
                    } else {
                        var l = new line(attribs);
                        l.elem = e;
                        lines.push(l);
                    }
                });

            checkIdScope();

            for (var i = 0; i < blocks.length; i++)
                console.log(blocks[i]);
            for (var i = 0; i < lines.length; i++)
                console.log(lines[i]);

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

        function getType(attribs) {
            if (('dia-line-start' in attribs) && ('dia-line-end' in attribs))
                return type.line;

            if (attribs['dia-type'] == 'line')
                return type.line;

            var hasPos = ('dia-pos' in attribs);
            var hasPivot = ('hasPivot' in getType);

            if (hasPos || !hasPivot) {
                if (!hasPos)
                    getType.hasPivot = true;

                if (!('dia-type' in attribs))
                    return type.rect;

                if (attribs['dia-type'] == 'rectangle')
                    return type.rect;
                if (attribs['dia-type'] == 'ellipse')
                    return type.ellipse;

                throw 'Unknown "dia-type" value';
            } 

            throw "No required attributes specified";
        }

        function block(attribs) {
            this.relDist = 20;
            this.alignCur = 0;
            this.alignRel = 0;
            this.shape = type.rect;

            if (attribs['dia-type'] == 'ellipse')
                this.shape = type.ellipse;

            this.id = attribs['id'];

            if ('dia-pos' in attribs) {
                var a = attribs['dia-pos'].split('+');

                if (a.length < 2)
                    throw "sadsfsf";

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
                default: throw "asdfasf";
                }
                this.relPos = pos;

                if (a[2] != null) {
                    if (a[2].substr(-2) != 'px')
                        throw "sadsfsf";

                    this.relDist = parseInt(a[2]);
                    if (this.relDist <= 0)
                        throw "sadsfsf";
                } 
            }

            if ('dia-align' in attribs) {
                var cur;
                switch (attribs['dia-align'][0]) {
                case 'a': cur = -0.5; break;
                case 'b': cur = 0; break;
                case 'c': cur = 0.5; break;
                default: throw "asdfasf";
                }

                var rel;
                switch (attribs['dia-align'][1]) {
                case '1': rel = 0.5; break;
                case '2': rel = 0; break;
                case '3': rel = -0.5; break;
                default: throw "asdfasf";
                }

                this.alignCur = cur;
                this.alignRel = rel;
            }

            if ('dia-size' in attribs) {
                var a = attribs['dia-size'].split(':');

                if (a.length != 2)
                    throw "sadsfsf";

                var w = parseInt(a[0]);
                var h = parseInt(a[1]);

                if (a[0].substr(-2) == 'px' && a[1].substr(-2) == 'px') {
                    this.minSize = new size(w, h);
                } else if (w > 0 && h > 0) {
                    this.prop = w / h;
                } else {
                    throw "sadsfsf";
                }
            }

            if ('dia-coords' in attribs) {
                var a = attribs['dia-coords'].split(':');

                if (a.length != 2)
                    throw "sadsfsf";

                var x = parseInt(a[0]);
                var y = parseInt(a[1]);

                if (a[0].substr(-2) == 'px' && a[1].substr(-2) == 'px' && x > 0 && y > 0) {
                    this.coords = new point(x, y);
                } else {
                    throw "sadsfsf";
                }
            }
        }

        function line(attribs) {
            this.startBlockShape = lineEndShape.none;
            this.endBlockShape = lineEndShape.none;
            this.capPos = capPos.center;
            this.capDir = capDir.hor;
            this.lineWidth = 1;
            this.lineStyle = lineStyle.solid;
            this.lineColor = "black";
            this.id = attribs['id'];

            function lineEnd(str) {
                var rc = {};
                var a = str.split('+');

                if (a.length < 2)
                    throw "sadsfsf";

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
                default: throw "asdfasf";
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
                default: throw "asdf";
                }
                rc['sh'] = sh;

                return rc;
            }

            var s = lineEnd(attribs['dia-line-start']);
            this.startBlockId = s.id;
            this.startBlockPos = s.pos;
            if (s.sh != null)
                this.startBlockShape = s.sh;

            var e = lineEnd(attribs['dia-line-end']);
            this.startBlockId = e.id;
            this.startBlockPos = e.pos;
            if (e.sh != null)
                this.startBlockShape = e.sh;


            switch (attribs['dia-direction']) {
            case 'hor': this.capDir = capDir.hor; break;
            case 'ver': this.capDir = capDir.ver; break;
            case undefined: break;
            default: throw "asdf";
            }

            switch (attribs['dia-text-pos']) {
            case 'center': this.capPos = capPos.center; break;
            case 'start': this.capPos = capPos.start; break;
            case 'end': this.capPos = capPos.end; break;
            case undefined: break;
            default: throw "asdf";
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
                    default: throw "asdf";
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
                        if (blocks[j].relId == blocks[i].id)
                            blocks[j].relId = i;
                    }

                    for (var j = 0; j < lines.length; j++) {
                        if (lines[j].startBlockId == blocks[i].id)
                            lines[j].startBlockId = i;
                        if (lines[j].endBlockId == blocks[i].id)
                            lines[j].endBlockId = i;
                    }
                    blocks[i].id = i;
            };

            for (var i = 0; i < blocks.length; i++) {
                if (typeof (blocks[i].relId) != 'number')
                    throw "asdfaf";
            }

            for (var i = 0; i < lines.length; i++) {
                if (typeof (lines[i].startBlockId) != 'number')
                    throw "asdfaf";
                if (typeof (lines[i].endBlockId) != 'number')
                    throw "asdfaf";
            }
        }


        return pub;
}());
