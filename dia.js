var dia = (function() { 
        var pub = {};

        var cfg = {
            gridSize: 10,
            imgSize: null,
            elem: null,
            id: null,
            capOffset: 2
        };

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

            this.manh = function(x, y) {
                if (arguments.length == 1) {
                    return Math.abs(this.x - x.x) + Math.abs(this.y - x.y);
                } else if (arguments.length == 2) {
                    return Math.abs(this.x - x) + Math.abs(this.y - y);
                }
                return undefined;
            }

            this.euclid = function(x, y) {
                if (arguments.length == 1) {
                    return Math.sqrt(
                        (this.x - x.x)*(this.x - x.x) 
                        + (this.y - x.y)*(this.y - x.y)
                    );
                } else if (arguments.length == 2) {
                    return Math.sqrt(
                        (this.x - x)*(this.x - x) + (this.y - y)*(this.y - y)
                    );
                }
                return undefined;
            }
        }

        function size(w, h) {
            this.w = w;
            this.h = h;
        }

        function isNum(str) {
            return str.match(/^\d+$/);
        }

        pub.draw = function(diaId) {
            blocks = [];
            lines = [];
            cfg.id = diaId;
            cfg.elem = $('#' + diaId);

            try {
                parseDescr_();

                blocksPos_();
            } catch (e) {
                console.log('#' + diaId + ': ' + e);
            }

            $(cfg.elem).css({'width': cfg.imgSize.w});
            $(cfg.elem).css({'height': cfg.imgSize.h});
            $(cfg.elem).css({'position': 'relative'});

            drawBlocks_();

            linesPos_();

            drawLines_();

            linesCaps_();

            drawCaps_();

            // for (var i = 0; i < blocks.length; i++)
            //     console.log(blocks[i]);
            // for (var i = 0; i < lines.length; i++)
            //     console.log(lines[i]);
        }

        function setDivDefaultCSS(elem) {
            $(elem).css({'position': 'absolute'});
            $(elem).css({'height': 'auto'});
            $(elem).css({'width': 'auto'});
            $(elem).css({'white-space': 'nowrap'});
            $(elem).css({'word-wrap': 'break-word'});
            $(elem).css({'text-align': 'center'});
        }

        function parseDescr_() {
            cfg.elem.children().each(function(id, e) {
                    try {
                        setDivDefaultCSS(e);
                        var attribs = getAttribs_(e);
                        delete getType_.hasPivot;
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
        }

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
                this.endBlockId = e.id;
                this.endBlockPos = e.pos;
                if (e.sh != null)
                    this.endBlockShape = e.sh;
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

        function blocksPos_() {
            blocksRelPos_();
            blocksAbsPos_();

            try {
                checkOverlaps_();
            } catch (e) {
                throw e;
            }
        }

        function blocksRelPos_() {
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
                    if (blocks[j].relId == undefined) // pivot or block with abs position
                        continue;
                    if (blocks[j].relId != blocks[i].id)
                        continue;

                    //Координаты блока j = 
                    //     коорд i
                    //     + расстояние между центрами по одной из компонент
                    //     + смещение (выравнивание) по другой

                    var x = blocks[i].coords.x + 
                        blocks[j].relPos.x * (blocks[i].size.w / 2 + blocks[j].relDist + blocks[j].size.w / 2) +
                        (blocks[j].alignCur * blocks[j].size.w + blocks[j].alignRel * blocks[i].size.w) 
                        * (1 - Math.abs(blocks[j].relPos.x));

                    var y = blocks[i].coords.y + 
                        blocks[j].relPos.y * (blocks[i].size.h / 2 + blocks[j].relDist + blocks[j].size.h / 2) +
                        (blocks[j].alignCur * blocks[j].size.h + blocks[j].alignRel * blocks[i].size.h)
                        * (1 - Math.abs(blocks[j].relPos.y));

                    blocks[j].coords = new point(x, y);
                }
            }
        }

        function blocksAbsPos_() {
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

        function checkOverlaps_() {
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

        function drawBlocks_() {
            $.each(blocks, function(i, block) {
                    var top_ = block.coords.y - block.size.h / 2;
                    var left = block.coords.x - block.size.w / 2;

                    $(block.elem).css({'top': top_});
                    $(block.elem).css({'left': left});
                    $(block.elem).css({'width': block.size.w});
                    $(block.elem).css({'height': block.size.h});

                    if (block.type == type.ellipse) {
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

        function linesPos_() {
            var g = new grid();

            $.each(lines, function(i, line) {
                    var stB = blocks[line.startBlockId];
                    var stX = stB.coords.x + 0.5 * stB.size.w * line.startBlockPos.x;
                    var stY = stB.coords.y + 0.5 * stB.size.h * line.startBlockPos.y;
                    var start = new point(Math.round(stX / g.h), Math.round(stY / g.h));

                    var enB = blocks[line.endBlockId];
                    var enX = enB.coords.x + 0.5 * enB.size.w * line.endBlockPos.x;
                    var enY = enB.coords.y + 0.5 * enB.size.h * line.endBlockPos.y;
                    var end = new point(Math.round(enX / g.h), Math.round(enY / g.h));

                    line.points = findPath(g, start, end);
                });
        }

        function grid() {
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

            fillGrid(this);
        }

        function fillGrid(grid) {
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

            return restorePath(grid, parents, start, end);
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

        function restorePath(grid, path, start, end) {
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

        function drawLines_() {
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

        function lineCapPos(line) {
            var p;
            var dx, dy;
            if (line.capPos == capPos.start) {
                p = line.points[0];

                dx = line.points[1].x - line.points[0].x;
                dy = line.points[1].y - line.points[0].y;

            } else if (line.capPos == capPos.end) {
                var n = line.points.length - 1;

                p = line.points[n];

                dx = line.points[n - 1].x - line.points[n].x;
                dy = line.points[n - 1].y - line.points[n].y;
            } else if (line.capPos == capPos.center) {
                var len = 0;
                for (var i = 1; i < line.points.length; i++)
                    len += line.points[i].manh(line.points[i - 1]);

                var l = 0;
                var s;
                for (s = 1; s < line.points.length; s++) {
                    var ll = line.points[s].manh(line.points[s - 1]);
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
            if (line.capDir == capDir.ver) {
                text = new size(text.h, text.w);
            }

            if (line.capPos != capPos.center) {
                if (dx != 0) {
                    if (dx > 0) 
                        x = p.x + e;
                    if (dx < 0) 
                        x = p.x - e - text.w;
                    if (line.capDir == capDir.hor)
                        y = p.y - e - text.h;
                    if (line.capDir == capDir.ver)
                        y = p.y - text.h / 2;
                }
                if (dy != 0) {
                    if (dy > 0)
                        y = p.y + e;
                    if (dy < 0)
                        y = p.y - e - text.h;
                    if (line.capDir == capDir.hor)
                        x = p.x - text.w / 2;
                    if (line.capDir == capDir.ver) 
                        x = p.x - e - text.w;
                }
            } else {
                if (line.capDir == capDir.hor) {
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

            if (line.capDir == capDir.ver) {
                x = x - text.w - e;
                y = y + text.w + e;
            }

            line.capCoords = new point(x, y);
        }

        function linesCaps_() {
            $.each(lines, function(i, line) {
                    if (!$(line.elem).is(':empty'))
                        lineCapPos(line);
                });
        }

        function drawCaps_() {
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i];
                if (!('capCoords' in l))
                    continue;

                if (l.capDir == capDir.ver) {
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
