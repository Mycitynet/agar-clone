(function (wHandle, wjQuery) {
    /**
     * Enter url in the following format: HOST : PORT
     *
     * Example: 127.0.0.1:443
     *
     */
    var CONNECTION_URL = "162.243.157.40:443";
    /**
     * Enter path to the skin image folder
     * To take skins from the official server enter: "http://agar.io/skins/"
     */
    var SKIN_URL = "./skins/";//skins folder

    function gameLoop() {
        ma = true;
        getServerList();
        setInterval(getServerList, 18E4);
        Canvas = nCanvas = document.getElementById("canvas");
        ctx = Canvas.getContext("2d");
        Canvas.onmousedown = function (event) {
            if (isTouchStart) {
                var xOffset = event.clientX - (5 + canvasWidth / 5 / 2),
                    yOffset = event.clientY - (5 + canvasWidth / 5 / 2);
                if (Math.sqrt(xOffset * xOffset + yOffset * yOffset) <= canvasWidth / 5 / 2) {
                    sendMouseMove();
                    sendUint8(17);
                    return
                }
            }
            rawMouseX = event.clientX;
            rawMouseY = event.clientY;
            mouseCoordinateChange();
            sendMouseMove()
        };
        Canvas.onmousemove = function (event) {
            rawMouseX = event.clientX;
            rawMouseY = event.clientY;
            mouseCoordinateChange()
        };
        Canvas.onmouseup = function () {
        };
        if (/firefox/i.test(navigator.userAgent)) {
            document.addEventListener("DOMMouseScroll", handleWheel, false);
        } else {
            document.body.onmousewheel = handleWheel;
        }
        var spacePressed = false,
            qPressed = false,
            wPressed = false;
        wHandle.onkeydown = function (event) {
            switch (event.keyCode) {
                case 32: // split
                    if (!spacePressed) {
                        sendMouseMove();
                        sendUint8(17);
                        spacePressed = true;
                    }
                    break;
                case 81: // key q pressed
                    if (!qPressed) {
                        sendUint8(18);
                        qPressed = true;
                    }
                    break;
                case 87: // eject mass
                    if (!wPressed) {
                        sendMouseMove();
                        sendUint8(21);
                        wPressed = true;
                    }
                    break;
                case 27: // quit
                    showOverlays(true);
                    break;
            }
        };
        wHandle.onkeyup = function (event) {
            switch (event.keyCode) {
                case 32:
                    spacePressed = false;
                    break;
                case 87:
                    wPressed = false;
                    break;
                case 81:
                    if (qPressed) {
                        sendUint8(19);
                        qPressed = false;
                    }
            }
        };
        wHandle.onblur = function () {
            sendUint8(19);
            wPressed = qPressed = spacePressed = false
        };

        wHandle.onresize = canvasResize;
        canvasResize();
        if (wHandle.requestAnimationFrame) {
            wHandle.requestAnimationFrame(redrawGameScene);
        } else {
            setInterval(drawGameScene, 1E3 / 60);
        }
        setInterval(sendMouseMove, 40);
        if (w) {
            wjQuery("#region").val(w);
        }
        Ha();
        setRegion(wjQuery("#region").val());
        null == ws && w && showConnecting();
        wjQuery("#overlays").show()
    }


    function handleWheel(event) {
        zoom *= Math.pow(.9, event.wheelDelta / -120 || event.detail || 0);
        1 > zoom && (zoom = 1);
        zoom > 4 / viewZoom && (zoom = 4 / viewZoom)
    }

    function buildQTree() {
        if (.4 > viewZoom) qTree = null;
        else {
            var a = Number.POSITIVE_INFINITY,
                b = Number.POSITIVE_INFINITY,
                c = Number.NEGATIVE_INFINITY,
                d = Number.NEGATIVE_INFINITY,
                e = 0;
            for (var i = 0; i < nodelist.length; i++) {
                var node = nodelist[i];
                if (node.shouldRender() && !node.prepareData && 20 < node.size * viewZoom) {
                    e = Math.max(node.size, e);
                    a = Math.min(node.x, a);
                    b = Math.min(node.y, b);
                    c = Math.max(node.x, c);
                    d = Math.max(node.y, d);
                }
            }
            qTree = Quad.init({
                minX: a - (e + 100),
                minY: b - (e + 100),
                maxX: c + (e + 100),
                maxY: d + (e + 100),
                maxChildren: 2,
                maxDepth: 4
            });
            for (i = 0; i < nodelist.length; i++) {
                node = nodelist[i];
                if (node.shouldRender() && !(20 >= node.size * viewZoom)) {
                    for (a = 0; a < node.points.length; ++a) {
                        b = node.points[a].x;
                        c = node.points[a].y;
                        b < nodeX - canvasWidth / 2 / viewZoom || c < nodeY - canvasHeight / 2 / viewZoom || b > nodeX + canvasWidth / 2 / viewZoom || c > nodeY + canvasHeight / 2 / viewZoom || qTree.insert(node.points[a]);
                    }
                }
            }
        }
    }

    function mouseCoordinateChange() {
        X = (rawMouseX - canvasWidth / 2) / viewZoom + nodeX;
        Y = (rawMouseY - canvasHeight / 2) / viewZoom + nodeY
    }

    function getServerList() {
        if (null == $) {
            $ = {};
            wjQuery("#region").children().each(function () {
                var a = wjQuery(this),
                    b = a.val();
                b && ($[b] = a.text())
            });
        }
        wjQuery.get("info.php", function (a) {
            var b = {}, c;
            for (c in a.regions) {
                var d = c.split(":")[0];
                b[d] = b[d] || 0;
                b[d] += a.regions[c].numPlayers
            }
            for (c in b) wjQuery('#region option[value="' + c + '"]').text($[c] + " (" + b[c] + " players)")
        }, "json")
    }

    function hideOverlays() {
        wjQuery("#adsBottom").hide();
        wjQuery("#overlays").hide();
        Ha()
    }

    function setRegion(a) {
        if (a && a != w) {
            if (wjQuery("#region").val() != a) {
                wjQuery("#region").val(a);
            }
            w = wHandle.localStorage.location = a;
            wjQuery(".region-message").hide();
            wjQuery(".region-message." + a).show();
            wjQuery(".btn-needs-server").prop("disabled", false);
            ma && showConnecting();
        }
    }

    function showOverlays(arg) {
        userNickName = null;
        wjQuery("#overlays").fadeIn(arg ? 200 : 3E3);
        arg || wjQuery("#adsBottom").fadeIn(3E3)
    }

    function Ha() {
        wjQuery("#region").val() ? wHandle.localStorage.location = wjQuery("#region").val() : wHandle.localStorage.location && wjQuery("#region").val(wHandle.localStorage.location);
        wjQuery("#region").val() ? wjQuery("#locationKnown").append(wjQuery("#region")) : wjQuery("#locationUnknown").append(wjQuery("#region"))
    }

    function attemptConnection() {
        console.log("Find " + w + N);
        wjQuery.ajax("main.php", {
            error: function () {
                setTimeout(attemptConnection, 1E3)
            },
            success: function (a) {
                wsConnect("ws://" + CONNECTION_URL)
            },
            dataType: "text",
            method: "POST",
            cache: false,
            crossDomain: true,
            data: w + N || "?"
        })
    }

    function showConnecting() {
        if (ma && w) {
            wjQuery("#connecting").show();
            attemptConnection()
        }
    }

    function wsConnect(wsUrl) {
        if (ws) {
            ws.onopen = null;
            ws.onmessage = null;
            ws.onclose = null;
            try {
                ws.close()
            } catch (b) {
            }
            ws = null
        }
        var c = CONNECTION_URL;
        if (/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+$/.test(c) && 5 != +c.split(".")[0]) {
            wsUrl = "ws://" + c;
        }
        if (localProtocolHttps) {
            wsUrl = wsUrl.split(":");
            wsUrl = wsUrl[0] + "_strokeColor://ip-" + wsUrl[1].replace(/\./g, "-").replace(/\//g, "") + ".tech.agar.io:" + (+wsUrl[2] + 2E3);
        }
        nodesOnScreen = [];
        playerCells = [];
        A = {};
        nodelist = [];
        Cells = [];
        leaderBoard = [];
        Canvas = teamScores = null;
        userScore = 0;
        console.log("Connecting to " + wsUrl);
        ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        ws.onopen = onWsOpen;
        ws.onmessage = onWsMessage;
        ws.onclose = onWsClose;
        ws.onerror = function () {
            console.log("socket error")
        }
    }

    function prepareData(a) {
        return new DataView(new ArrayBuffer(a))
    }

    function wsSend(a) {
        ws.send(a.buffer)
    }

    function onWsOpen() {
        var msg;
        delay = 500;
        wjQuery("#connecting").hide();
        console.log("socket open");
        msg = prepareData(5);
        msg.setUint8(0, 254);
        msg.setUint32(1, 4, true);
        wsSend(msg);
        msg = prepareData(5);
        msg.setUint8(0, 255);
        msg.setUint32(1, 673720361, true);
        wsSend(msg);
        sendNickName()
    }

    function onWsClose() {
        console.log("socket close");
        setTimeout(showConnecting, delay);
        delay *= 1.5
    }

    function onWsMessage(msg) {
        handleWsMessage(new DataView(msg.data))
    }

    function handleWsMessage(msg) {
        function getString() {
            var text = '',
                char = 0;
            while ((char = msg.getUint16(offset, true)) != 0) {
                offset += 2;
                text += String.fromCharCode(char);
            }
            offset += 2;
            return text;
        }

        var offset = 0,
            setCustomLB = false;
        240 == msg.getUint8(offset) && (offset += 5);
        switch (msg.getUint8(offset++)) {
            case 16: // update nodes
                updateNodes(msg, offset);
                break;
            case 17: // update position
                posX = msg.getFloat32(offset, true);
                offset += 4;
                posY = msg.getFloat32(offset, true);
                offset += 4;
                posSize = msg.getFloat32(offset, true);
                offset += 4;
                break;
            case 20: // clear nodes
                playerCells = [];
                nodesOnScreen = [];
                break;
            case 21: // draw line
                lineX = msg.getInt16(offset, true);
                offset += 2;
                lineY = msg.getInt16(offset, true);
                offset += 2;
                if (!ta) {
                    ta = true;
                    ca = lineX;
                    da = lineY;
                }
                break;
            case 32: // add node
                nodesOnScreen.push(msg.getUint32(offset, true));
                offset += 4;
                break;
            case 48: // update leaderboard (custom text)
                setCustomLB = true;
                noRanking = true;
            case 49: // update leaderboard (ffa)
                if (!setCustomLB) {
                    noRanking = false;
                }
                teamScores = null;
                var validElements = msg.getUint32(offset, true);
                offset += 4;
                leaderBoard = [];
                for (var i = 0; i < validElements; ++i) {
                    var nodeId = msg.getUint32(offset, true);
                    offset += 4;
                    leaderBoard.push({
                        id: nodeId,
                        name: getString()
                    })
                }
                drawLeaderBoard();
                break;
            case 50: // update leaderboard (teams)
                teamScores = [];
                var validElements = msg.getUint32(offset, true);
                offset += 4;
                for (var i = 0; i < validElements; ++i) {
                    teamScores.push(msg.getFloat32(offset, true));
                    offset += 4;
                }
                drawLeaderBoard();
                break;
            case 64: // set border
                leftPos = msg.getFloat64(offset, true);
                offset += 8;
                topPos = msg.getFloat64(offset, true);
                offset += 8;
                rightPos = msg.getFloat64(offset, true);
                offset += 8;
                bottomPos = msg.getFloat64(offset, true);
                offset += 8;
                posX = (rightPos + leftPos) / 2;
                posY = (bottomPos + topPos) / 2;
                posSize = 1;
                if (0 == playerCells.length) {
                    nodeX = posX;
                    nodeY = posY;
                    viewZoom = posSize;
                }
                break;
        }
    }

    function updateNodes(view, offset) {
        timestamp = +new Date;
        var code = Math.random();
        ua = false;
        var queueLength = view.getUint16(offset, true);
        offset += 2;
        for (var i = 0; i < queueLength; ++i) {
            var killer = A[view.getUint32(offset, true)],
                killedNode = A[view.getUint32(offset + 4, true)];
            offset += 8;
            if (killer && killedNode) {
                killedNode.destroy();
                killedNode.ox = killedNode.x;
                killedNode.oy = killedNode.y;
                killedNode.oSize = killedNode.size;
                killedNode.nx = killer.x;
                killedNode.ny = killer.y;
                killedNode.nSize = killedNode.size;
                killedNode.updateTime = timestamp;
            }
        }
        for (var i = 0; ;) {
            var nodeId = view.getUint32(offset, true);
            offset += 4;
            if (0 == nodeId) break;
            ++i;
            var size, posY, posX = view.getInt16(offset, true);
            offset += 2;
            posY = view.getInt16(offset, true);
            offset += 2;
            size = view.getInt16(offset, true);
            offset += 2;
            for (var r = view.getUint8(offset++), g = view.getUint8(offset++), b = view.getUint8(offset++),
                     color = (r << 16 | g << 8 | b).toString(16); 6 > color.length;) color = "0" + color;
            var color = "#" + color,
                flags = view.getUint8(offset++),
                flagVirus = !!(flags & 1),
                flagAgitated = !!(flags & 16);
            flags & 2 && (offset += 4);
            flags & 4 && (offset += 8);
            flags & 8 && (offset += 16);
            for (var char, name = ""; ;) {
                char = view.getUint16(offset, true);
                offset += 2;
                if (0 == char) break;
                name += String.fromCharCode(char)
            }
            var node = null;
            if (A.hasOwnProperty(nodeId)) {
                node = A[nodeId];
                node.updatePos();
                node.ox = node.x;
                node.oy = node.y;
                node.oSize = node.size;
                node.color = color;
            } else {
                node = new Cell(nodeId, posX, posY, size, color, name);
                nodelist.push(node);
                A[nodeId] = node;
                node.ka = posX;
                node.la = posY;
            }
            node.isVirus = flagVirus;
            node.isAgitated = flagAgitated;
            node.nx = posX;
            node.ny = posY;
            node.nSize = size;
            node.updateCode = code;
            node.updateTime = timestamp;
            node.nnn = flags;
            name && node.setName(name);
            if (-1 != nodesOnScreen.indexOf(nodeId) && -1 == playerCells.indexOf(node)) {
                document.getElementById("overlays").style.display = "none";
                playerCells.push(node);
                if (1 == playerCells.length) {
                    nodeX = node.x;
                    nodeY = node.y;
                }
            }
        }
        var queueLength = view.getUint32(offset, true);
        offset += 4;
        for (var i = 0; i < queueLength; i++) {
            var nodeId = view.getUint32(offset, true);
            offset += 4;
            node = A[nodeId];
            null != node && node.destroy();
        }
        ua && 0 == playerCells.length && showOverlays(false)
    }

    function sendMouseMove() {
        var msg;
        if (wsIsOpen()) {
            msg = rawMouseX - canvasWidth / 2;
            var b = rawMouseY - canvasHeight / 2;
            if (64 <= msg * msg + b * b && !(.01 > Math.abs(oldX - X) && .01 > Math.abs(oldY - Y))) {
                oldX = X;
                oldY = Y;
                msg = prepareData(21);
                msg.setUint8(0, 16);
                msg.setFloat64(1, X, true);
                msg.setFloat64(9, Y, true);
                msg.setUint32(17, 0, true);
                wsSend(msg);
            }
        }
    }

    function sendNickName() {
        if (wsIsOpen() && null != userNickName) {
            var msg = prepareData(1 + 2 * userNickName.length);
            msg.setUint8(0, 0);
            for (var i = 0; i < userNickName.length; ++i) msg.setUint16(1 + 2 * i, userNickName.charCodeAt(i), true);
            wsSend(msg)
        }
    }

    function wsIsOpen() {
        return null != ws && ws.readyState == ws.OPEN
    }

    function sendUint8(a) {
        if (wsIsOpen()) {
            var msg = prepareData(1);
            msg.setUint8(0, a);
            wsSend(msg)
        }
    }

    function redrawGameScene() {
        drawGameScene();
        wHandle.requestAnimationFrame(redrawGameScene)
    }

    function canvasResize() {
        canvasWidth = wHandle.innerWidth;
        canvasHeight = wHandle.innerHeight;
        nCanvas.width = Canvas.width = canvasWidth;
        nCanvas.height = Canvas.height = canvasHeight;
        drawGameScene()
    }

    function viewRange() {
        var a;
        a = Math.max(canvasHeight / 1080, canvasWidth / 1920);
        return a *= zoom
    }

    function calcViewZoom() {
        if (0 != playerCells.length) {
            for (var a = 0, b = 0; b < playerCells.length; b++) a += playerCells[b].size;
            a = Math.pow(Math.min(64 / a, 1), .4) * viewRange();
            viewZoom = (9 * viewZoom + a) / 10
        }
    }

    function drawGameScene() {
        var a, b = Date.now();
        ++cb;
        timestamp = b;
        if (0 < playerCells.length) {
            calcViewZoom();
            var c = a = 0;
            for (var d = 0; d < playerCells.length; d++) {
                playerCells[d].updatePos();
                a += playerCells[d].x / playerCells.length;
                c += playerCells[d].y / playerCells.length;
            }
            posX = a;
            posY = c;
            posSize = viewZoom;
            nodeX = (nodeX + a) / 2;
            nodeY = (nodeY + c) / 2
        } else {
            nodeX = (29 * nodeX + posX) / 30;
            nodeY = (29 * nodeY + posY) / 30;
            viewZoom = (9 * viewZoom + posSize * viewRange()) / 10;
        }
        buildQTree();
        mouseCoordinateChange();
        xa || ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (xa) {
            if (showDarkTheme) {
                ctx.fillStyle = '#111111';
                ctx.globalAlpha = .05;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = '#F2FBFF';
                ctx.globalAlpha = .05;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.globalAlpha = 1;
            }
        } else {
            drawGrid();
        }
        nodelist.sort(function (a, b) {
            return a.size == b.size ? a.id - b.id : a.size - b.size
        });
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(viewZoom, viewZoom);
        ctx.translate(-nodeX, -nodeY);
        for (d = 0; d < Cells.length; d++) Cells[d].drawOneCell(ctx);

        for (d = 0; d < nodelist.length; d++) nodelist[d].drawOneCell(ctx);
        //console.log(Cells.length);
        if (ta) {
            ca = (3 * ca + lineX) /
                4;
            da = (3 * da + lineY) / 4;
            ctx.save();
            ctx.strokeStyle = "#FFAAAA";
            ctx.lineWidth = 10;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.globalAlpha = .5;
            ctx.beginPath();
            for (d = 0; d < playerCells.length; d++) {
                ctx.moveTo(playerCells[d].x, playerCells[d].y);
                ctx.lineTo(ca, da);
            }
            ctx.stroke();
            ctx.restore()
        }
        ctx.restore();
        Canvas && Canvas.width && ctx.drawImage(Canvas, canvasWidth - Canvas.width - 10, 10);
        userScore = Math.max(userScore, calcUserScore());
        if (0 != userScore) {
            if (null == scoreText) {
                scoreText = new uText(24, '#FFFFFF');
            }
            scoreText.setValue('Score: ' + ~~(userScore / 100));
            c = scoreText.render();
            a = c.width;
            ctx.globalAlpha = .2;
            ctx.fillStyle = '#000000';
            ctx.fillRect(10, canvasHeight - 10 - 24 - 10, a + 10, 34);
            ctx.globalAlpha = 1;
            ctx.drawImage(c, 15, canvasHeight - 10 - 24 - 5);
        }
        drawSplitIcon();
        b = Date.now() - b;
        b > 1E3 / 60 ? z -= .01 : b < 1E3 / 65 && (z += .01);
        .4 > z && (z = .4);
        1 < z && (z = 1)
    }

    function drawGrid() {
        ctx.fillStyle = showDarkTheme ? "#111111" : "#F2FBFF";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.save();
        ctx.strokeStyle = showDarkTheme ? "#AAAAAA" : "#000000";
        ctx.globalAlpha = .2;
        ctx.scale(viewZoom, viewZoom);
        var a = canvasWidth / viewZoom,
            b = canvasHeight / viewZoom;
        for (var c = -.5 + (-nodeX + a / 2) % 50; c < a; c += 50) {
            ctx.beginPath();
            ctx.moveTo(c, 0);
            ctx.lineTo(c, b);
            ctx.stroke();
        }
        for (c = -.5 + (-nodeY + b / 2) % 50; c < b; c += 50) {
            ctx.beginPath();
            ctx.moveTo(0, c);
            ctx.lineTo(a, c);
            ctx.stroke();
        }
        ctx.restore()
    }

    function drawSplitIcon() {
        if (isTouchStart && splitIcon.width) {
            var size = canvasWidth / 5;
            ctx.drawImage(splitIcon, 5, 5, size, size)
        }
    }

    function calcUserScore() {
        for (var score = 0, i = 0; i < playerCells.length; i++) score += playerCells[i].nSize * playerCells[i].nSize;
        return score
    }

    function drawLeaderBoard() {
        Canvas = null;
        if (null != teamScores || 0 != leaderBoard.length)
            if (null != teamScores || showName) {
                Canvas = document.createElement("canvas");
                var ctx = Canvas.getContext("2d"),
                    b = 60,
                    b = null == teamScores ? b + 24 * leaderBoard.length : b + 180,
                    c = Math.min(200, .3 * canvasWidth) / 200;
                Canvas.width = 200 * c;
                Canvas.height = b * c;
                ctx.scale(c, c);
                ctx.globalAlpha = .4;
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, 200, b);
                ctx.globalAlpha = 1;
                ctx.fillStyle = "#FFFFFF";
                c = null;
                c = "Leaderboard";
                ctx.font = "30px Ubuntu";
                ctx.fillText(c, 100 - ctx.measureText(c).width / 2, 40);
                if (null == teamScores) {
                    for (ctx.font = "20px Ubuntu", b = 0; b < leaderBoard.length; ++b) {
                        c = leaderBoard[b].name || "An unnamed cell";
                        if (!showName) {
                            (c = "An unnamed cell");
                        }
                        if (-1 != nodesOnScreen.indexOf(leaderBoard[b].id)) {
                            playerCells[0].name && (c = playerCells[0].name);
                            ctx.fillStyle = "#FFAAAA";
                            if (!noRanking) {
                                c = b + 1 + ". " + c;
                            }
                            ctx.fillText(c, 100 - ctx.measureText(c).width / 2, 70 + 24 * b);
                        } else {
                            ctx.fillStyle = "#FFFFFF";
                            if (!noRanking) {
                                c = b + 1 + ". " + c;
                            }
                            ctx.fillText(c, 100 - ctx.measureText(c).width / 2, 70 + 24 * b);
                        }
                    }
                }
                else {
                    for (b = c = 0; b < teamScores.length; ++b) {
                        var d = c + teamScores[b] * Math.PI * 2;
                        ctx.fillStyle = teamColor[b + 1];
                        ctx.beginPath();
                        ctx.moveTo(100, 140);
                        ctx.arc(100, 140, 80, c, d, false);
                        ctx.fill();
                        c = d
                    }
                }
            }
    }

    function Cell(uid, ux, uy, usize, ucolor, uname) {
        this.id = uid;
        this.ox = this.x = ux;
        this.oy = this.y = uy;
        this.oSize = this.size = usize;
        this.color = ucolor;
        this.points = [];
        this.pointsAcc = [];
        this.createPoints();
        this.setName(uname)
    }

    function uText(usize, ucolor, ustroke, ustrokecolor) {
        usize && (this._size = usize);
        ucolor && (this._color = ucolor);
        this._stroke = !!ustroke;
        ustrokecolor && (this._strokeColor = ustrokecolor)
    }


    var localProtocol = wHandle.location.protocol,
        localProtocolHttps = "https:" == localProtocol;
    if (wHandle.location.ancestorOrigins && wHandle.location.ancestorOrigins.length && "https://apps.facebook.com" != wHandle.location.ancestorOrigins[0]) wHandle.top.location = "http://agar.io/";
    else {
        var nCanvas, ctx, Canvas, canvasWidth, canvasHeight, qTree = null,
            ws = null,
            nodeX = 0,
            nodeY = 0,
            nodesOnScreen = [],
            playerCells = [],
            A = {}, nodelist = [],
            Cells = [],
            leaderBoard = [],
            rawMouseX = 0,
            rawMouseY = 0,
            X = -1,
            Y = -1,
            cb = 0,
            timestamp = 0,
            userNickName = null,
            leftPos = 0,
            topPos = 0,
            rightPos = 1E4,
            bottomPos = 1E4,
            viewZoom = 1,
            w = null,
            showSkin = true,
            showName = true,
            showColor = false,
            ua = false,
            userScore = 0,
            showDarkTheme = false,
            showMass = false,
            posX = nodeX = ~~((leftPos + rightPos) / 2),
            posY = nodeY = ~~((topPos + bottomPos) / 2),
            posSize = 1,
            N = "",
            teamScores = null,
            ma = false,
            ta = false,
            lineX = 0,
            lineY = 0,
            ca = 0,
            da = 0,
            Ra = 0,
            teamColor = ["#333333", "#FF3333", "#33FF33", "#3333FF"],
            xa = false,
            zoom = 1,
            isTouchStart = "ontouchstart" in wHandle && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            splitIcon = new Image,
            noRanking = false;
        splitIcon.src = "http://agar.io/img/split.png";
        var Sa = document.createElement("canvas");
        if ("undefined" == typeof console || "undefined" == typeof DataView || "undefined" == typeof WebSocket || null == Sa || null == Sa.getContext || null == wHandle.localStorage) alert("You browser does not support this game, we recommend you to use Firefox to play this");
        else {
            var $ = null;
            wHandle.setNick = function (arg) {
                hideOverlays();
                userNickName = arg;
                sendNickName();
                userScore = 0
            };
            wHandle.setRegion = setRegion;
            wHandle.setSkins = function (arg) {
                showSkin = arg
            };
            wHandle.setNames = function (arg) {
                showName = arg
            };
            wHandle.setDarkTheme = function (arg) {
                showDarkTheme = arg
            };
            wHandle.setColors = function (arg) {
                showColor = arg
            };
            wHandle.setShowMass = function (arg) {
                showMass = arg
            };
            wHandle.spectate = function () {
                userNickName = null;
                sendUint8(1);
                hideOverlays()
            };
            wHandle.setGameMode = function (arg) {
                if (arg != N) {
                    N = arg;
                    showConnecting();
                }
            };
            wHandle.setAcid = function (arg) {
                xa = arg
            };
            if (null != wHandle.localStorage) {
                if (null == wHandle.localStorage.AB8) {
                    wHandle.localStorage.AB8 = ~~(100 * Math.random());
                }
                Ra = +wHandle.localStorage.AB8;
                wHandle.ABGroup = Ra;
            }
            wjQuery.get(localProtocol + "//gc.agar.io", function (a) {
                var b = a.split(" ");
                a = b[0];
                b = b[1] || "";
                -1 == "DE IL PL HU BR AT UA".split(" ").indexOf(a) && knownNameDict.push("nazi");
                -1 == ["UA"].indexOf(a) && knownNameDict.push("ussr");
                T.hasOwnProperty(a) && ("string" == typeof T[a] ? w || setRegion(T[a]) : T[a].hasOwnProperty(b) && (w || setRegion(T[a][b])))
            }, "text");
            setTimeout(function () {
            }, 3E5);
            var T = {
                ZW: "EU-London"
            };
            wHandle.connect = wsConnect;

            //This part is for loading custon skins
            var data = {"action": "test"};
            var response = null;
            wjQuery.ajax({
                type: "POST",
                dataType: "json",
                url: "checkdir.php", //Relative or absolute path to response.php file
                data: data,
                success: function (data) {
                    //alert(data["names"]);
                    response = JSON.parse(data["names"]);
                }
            });


            var interval1Id = setInterval(function () {
                //console.log("logging every 5 seconds");
                //console.log(Aa);

                wjQuery.ajax({
                    type: "POST",
                    dataType: "json",
                    url: "checkdir.php", //Relative or absolute path to response.php file
                    data: data,
                    success: function (data) {
                        //alert(data["names"]);
                        response = JSON.parse(data["names"]);
                    }
                });
                //console.log(response);
                for (var i = 0; i < response.length; i++) {
                    //console.log(response[insert]);
                    if (-1 == knownNameDict.indexOf(response[i])) {
                        knownNameDict.push(response[i]);
                        //console.log("Add:"+response[i]);
                    }
                }
            }, 15000);


            var delay = 500,
                oldX = -1,
                oldY = -1,
                Canvas = null,
                z = 1,
                scoreText = null,
                K = {},
                knownNameDict = "poland;usa;china;russia;canada;australia;spain;brazil;germany;ukraine;france;sweden;hitler;north korea;south korea;japan;united kingdom;earth;greece;latvia;lithuania;estonia;finland;norway;cia;maldivas;austria;nigeria;reddit;yaranaika;confederate;9gag;indiana;4chan;italy;bulgaria;tumblr;2ch.hk;hong kong;portugal;jamaica;german empire;mexico;sanik;switzerland;croatia;chile;indonesia;bangladesh;thailand;iran;iraq;peru;moon;botswana;bosnia;netherlands;european union;taiwan;pakistan;hungary;satanist;qing dynasty;matriarchy;patriarchy;feminism;ireland;texas;facepunch;prodota;cambodia;steam;piccolo;india;kc;denmark;quebec;ayy lmao;sealand;bait;tsarist russia;origin;vinesauce;stalin;belgium;luxembourg;stussy;prussia;8ch;argentina;scotland;sir;romania;belarus;wojak;doge;nasa;byzantium;imperial japan;french kingdom;somalia;turkey;mars;pokerface;8;irs;receita federal;facebook".split(";"),
                hb = ["8", "nasa"],
                ib = ["_canvas'blob"];
            Cell.prototype = {
                id: 0,
                points: null,
                pointsAcc: null,
                name: null,
                nameCache: null,
                sizeCache: null,
                x: 0,
                y: 0,
                size: 0,
                ox: 0,
                oy: 0,
                oSize: 0,
                nx: 0,
                ny: 0,
                nSize: 0,
                nnn: 0,
                updateTime: 0,
                updateCode: 0,
                drawTime: 0,
                destroyed: false,
                isVirus: false,
                isAgitated: false,
                wasSimpleDrawing: true,
                destroy: function () {
                    var a;
                    for (a = 0; a < nodelist.length; a++)
                        if (nodelist[a] == this) {
                            nodelist.splice(a, 1);
                            break
                        }
                    delete A[this.id];
                    a = playerCells.indexOf(this);
                    if (-1 != a) {
                        ua = true;
                        playerCells.splice(a, 1);
                    }
                    a = nodesOnScreen.indexOf(this.id);
                    if (-1 != a) {
                        nodesOnScreen.splice(a, 1);
                    }
                    this.destroyed = true;
                    Cells.push(this)
                },
                getNameSize: function () {
                    return Math.max(~~(.3 * this.size), 24)
                },
                setName: function (a) {
                    if (this.name = a) {
                        if (null == this.nameCache) {
                            this.nameCache = new uText(this.getNameSize(), "#FFFFFF", true, "#000000");
                            this.nameCache.setValue(this.name);
                        } else {
                            this.nameCache.setSize(this.getNameSize());
                            this.nameCache.setValue(this.name);
                        }
                    }
                },
                createPoints: function () {
                    for (var a = this.getNumPoints(); this.points.length > a;) {
                        var b = ~~(Math.random() * this.points.length);
                        this.points.splice(b, 1);
                        this.pointsAcc.splice(b, 1)
                    }
                    if (0 == this.points.length && 0 < a) {
                        this.points.push({
                            S: this,
                            size: this.size,
                            x: this.x,
                            y: this.y
                        });
                        this.pointsAcc.push(Math.random() - .5);
                    }
                    while (this.points.length < a) {
                        var b = ~~(Math.random() * this.points.length),
                            c = this.points[b];
                        this.points.splice(b, 0, {
                            S: this,
                            size: c.size,
                            x: c.x,
                            y: c.y
                        });
                        this.pointsAcc.splice(b, 0, this.pointsAcc[b])
                    }
                },
                getNumPoints: function () {
                    if (0 == this.id) return 16;
                    var a = 10;
                    20 > this.size && (a = 0);
                    this.isVirus && (a = 30);
                    var b = this.size;
                    this.isVirus || (b *= viewZoom);
                    b *= z;
                    this.nnn & 32 && (b *= .25);
                    return ~~Math.max(b, a);
                },
                movePoints: function () {
                    this.createPoints();
                    for (var a = this.points, b = this.pointsAcc, c = a.length, d = 0; d < c; ++d) {
                        var e = b[(d - 1 + c) % c],
                            m = b[(d + 1) % c];
                        b[d] += (Math.random() - .5) * (this.isAgitated ? 3 : 1);
                        b[d] *= .7;
                        10 < b[d] && (b[d] = 10);
                        -10 > b[d] && (b[d] = -10);
                        b[d] = (e + m + 8 * b[d]) / 10
                    }
                    for (var h = this, g = this.isVirus ? 0 : (this.id / 1E3 + timestamp / 1E4) % (2 * Math.PI), d = 0; d < c; ++d) {
                        var f = a[d].size,
                            e = a[(d - 1 + c) % c].size,
                            m = a[(d + 1) % c].size;
                        if (15 < this.size && null != qTree && 20 < this.size * viewZoom && 0 != this.id) {
                            var l = false,
                                n = a[d].x,
                                q = a[d].y;
                            qTree.retrieve2(n - 5, q - 5, 10, 10, function (a) {
                                if (a.S != h && 25 > (n - a.x) * (n - a.x) + (q - a.y) * (q - a.y)) {
                                    l = true;
                                }
                            });
                            if (!l && a[d].x < leftPos || a[d].y < topPos || a[d].x > rightPos || a[d].y > bottomPos) {
                                l = true;
                            }
                            if (l) {
                                if (0 < b[d]) {
                                    (b[d] = 0);
                                }
                                b[d] -= 1;
                            }
                        }
                        f += b[d];
                        0 > f && (f = 0);
                        f = this.isAgitated ? (19 * f + this.size) / 20 : (12 * f + this.size) / 13;
                        a[d].size = (e + m + 8 * f) / 10;
                        e = 2 * Math.PI / c;
                        m = this.points[d].size;
                        this.isVirus && 0 == d % 2 && (m += 5);
                        a[d].x = this.x + Math.cos(e * d + g) * m;
                        a[d].y = this.y + Math.sin(e * d + g) * m
                    }
                },
                updatePos: function () {
                    if (0 == this.id) return 1;
                    var a;
                    a = (timestamp - this.updateTime) / 120;
                    a = 0 > a ? 0 : 1 < a ? 1 : a;
                    var b = 0 > a ? 0 : 1 < a ? 1 : a;
                    this.getNameSize();
                    if (this.destroyed && 1 <= b) {
                        var c = Cells.indexOf(this);
                        -1 != c && Cells.splice(c, 1)
                    }
                    this.x = a * (this.nx - this.ox) + this.ox;
                    this.y = a * (this.ny - this.oy) + this.oy;
                    this.size = b * (this.nSize - this.oSize) + this.oSize;
                    return b
                },
                shouldRender: function () {
                    if (0 == this.id) {
                        return true
                    } else {
                        return this.x + this.size + 40 < nodeX - canvasWidth / 2 / viewZoom || this.y + this.size + 40 < nodeY - canvasHeight / 2 / viewZoom || this.x - this.size - 40 > nodeX + canvasWidth / 2 / viewZoom || this.y - this.size - 40 > nodeY + canvasHeight / 2 / viewZoom ? false : true
                    }
                },
                drawOneCell: function (a) {
                    if (this.shouldRender()) {
                        var b = 0 != this.id && !this.isVirus && !this.isAgitated && .4 > viewZoom;
                        5 > this.getNumPoints() && (b = true);
                        if (this.wasSimpleDrawing && !b)
                            for (var c = 0; c < this.points.length; c++) this.points[c].size = this.size;
                        this.wasSimpleDrawing = b;
                        a.save();
                        this.drawTime = timestamp;
                        c = this.updatePos();
                        this.destroyed && (a.globalAlpha *= 1 - c);
                        a.lineWidth = 10;
                        a.lineCap = "round";
                        a.lineJoin = this.isVirus ? "miter" : "round";
                        if (showColor) {
                            a.fillStyle = "#FFFFFF";
                            a.strokeStyle = "#AAAAAA";
                        } else {
                            a.fillStyle = this.color;
                            a.strokeStyle = this.color;
                        }
                        if (b) {
                            a.beginPath();
                            a.arc(this.x, this.y, this.size, 0, 2 * Math.PI, false);
                        }
                        else {
                            this.movePoints();
                            a.beginPath();
                            var d = this.getNumPoints();
                            a.moveTo(this.points[0].x, this.points[0].y);
                            for (c = 1; c <= d; ++c) {
                                var e = c % d;
                                a.lineTo(this.points[e].x, this.points[e].y)
                            }
                        }
                        a.closePath();
                        d = this.name.toLowerCase();
                        if (!this.isAgitated && showSkin && ':teams' != N) {
                            if (-1 != knownNameDict.indexOf(d)) {
                                if (!K.hasOwnProperty(d)) {
                                    K[d] = new Image;
                                    K[d].src = SKIN_URL + d + '.png';
                                }
                                if (0 != K[d].width && K[d].complete) {
                                    c = K[d];
                                } else {
                                    c = null;
                                }
                            } else {
                                c = null;
                            }
                        } else {
                            c = null;
                        }
                        c = (e = c) ? -1 != ib.indexOf(d) : false;
                        b || a.stroke();
                        a.fill();
                        if (!(null == e || c)) {
                            a.save();
                            a.clip();
                            a.drawImage(e, this.x - this.size, this.y - this.size, 2 * this.size, 2 * this.size);
                            a.restore();
                        }
                        if ((showColor || 15 < this.size) && !b) {
                            a.strokeStyle = '#000000';
                            a.globalAlpha *= .1;
                            a.stroke();
                        }
                        a.globalAlpha = 1;
                        if (null != e && c) {
                            a.drawImage(e, this.x - 2 * this.size, this.y - 2 * this.size, 4 * this.size, 4 * this.size);
                        }
                        c = -1 != playerCells.indexOf(this);
                        if (0 != this.id) {
                            b = ~~this.y;
                            if ((showName || c) && this.name && this.nameCache && (null == e || -1 == hb.indexOf(d))) {
                                e = this.nameCache;
                                e.setValue(this.name);
                                e.setSize(this.getNameSize());
                                d = Math.ceil(10 * viewZoom) / 10;
                                e.setScale(d);
                                var e = e.render(),
                                    m = ~~(e.width / d),
                                    h = ~~(e.height / d);
                                a.drawImage(e, ~~this.x - ~~(m / 2), b - ~~(h / 2), m, h);
                                b += e.height / 2 / d + 4
                            }
                            if (showMass && (c || 0 == playerCells.length && (!this.isVirus || this.isAgitated) && 20 < this.size)) {
                                if (null == this.sizeCache) {
                                    this.sizeCache = new uText(this.getNameSize() / 2, "#FFFFFF", true, "#000000")
                                }
                                c = this.sizeCache;
                                c.setSize(this.getNameSize() / 2);
                                c.setValue(~~(this.size * this.size / 100));
                                d = Math.ceil(10 * viewZoom) / 10;
                                c.setScale(d);
                                e = c.render();
                                m = ~~(e.width / d);
                                h = ~~(e.height / d);
                                a.drawImage(e, ~~this.x - ~~(m / 2), b - ~~(h / 2), m, h);
                            }
                        }
                        a.restore()
                    }
                }
            };
            uText.prototype = {
                _value: "",
                _color: "#000000",
                _stroke: false,
                _strokeColor: "#000000",
                _size: 16,
                _canvas: null,
                _ctx: null,
                _dirty: false,
                _scale: 1,
                setSize: function (a) {
                    if (this._size != a) {
                        this._size = a;
                        this._dirty = true;
                    }
                },
                setScale: function (a) {
                    if (this._scale != a) {
                        this._scale = a;
                        this._dirty = true;
                    }
                },
                setStrokeColor: function (a) {
                    if (this._strokeColor != a) {
                        this._strokeColor = a;
                        this._dirty = true;
                    }
                },
                setValue: function (a) {
                    if (a != this._value) {
                        this._value = a;
                        this._dirty = true;
                    }
                },
                render: function () {
                    if (null == this._canvas) {
                        this._canvas = document.createElement("canvas");
                        this._ctx = this._canvas.getContext("2d");
                    }
                    if (this._dirty) {
                        this._dirty = false;
                        var a = this._canvas,
                            b = this._ctx,
                            c = this._value,
                            d = this._scale,
                            e = this._size,
                            m = e + 'px Ubuntu';
                        b.font = m;
                        var h = ~~(.2 * e);
                        a.width = (b.measureText(c).width +
                            6) * d;
                        a.height = (e + h) * d;
                        b.font = m;
                        b.scale(d, d);
                        b.globalAlpha = 1;
                        b.lineWidth = 3;
                        b.strokeStyle = this._strokeColor;
                        b.fillStyle = this._color;
                        this._stroke && b.strokeText(c, 3, e - h / 2);
                        b.fillText(c, 3, e - h / 2)
                    }
                    return this._canvas
                }
            };
            Date.now || (Date.now = function () {
                return (new Date).getTime()
            });
            var Quad = {
                init: function (args) {
                    function Node(x, y, w, h, depth) {
                        this.x = x;
                        this.y = y;
                        this.w = w;
                        this.h = h;
                        this.depth = depth;
                        this.items = [];
                        this.nodes = []
                    }

                    var c = args.maxChildren || 2,
                        d = args.maxDepth || 4;
                    Node.prototype = {
                        x: 0,
                        y: 0,
                        w: 0,
                        getNameSize: 0,
                        depth: 0,
                        items: null,
                        nodes: null,
                        exists: function (selector) {
                            for (var i = 0; i < this.items.length; ++i) {
                                var item = this.items[i];
                                if (item.x >= selector.x && item.y >= selector.y && item.x < selector.x + selector.w && item.y < selector.y + selector.getNameSize) return true
                            }
                            if (0 != this.nodes.length) {
                                var self = this;
                                return this.findOverlappingNodes(selector, function (dir) {
                                    return self.nodes[dir].exists(selector)
                                })
                            }
                            return false;
                        },
                        retrieve: function (item, callback) {
                            for (var i = 0; i < this.items.length; ++i) callback(this.items[i]);
                            if (0 != this.nodes.length) {
                                var self = this;
                                this.findOverlappingNodes(item, function (dir) {
                                    self.nodes[dir].retrieve(item, callback)
                                })
                            }
                        },
                        insert: function (a) {
                            if (0 != this.nodes.length) {
                                this.nodes[this.findInsertNode(a)].insert(a);
                            } else {
                                if (this.items.length >= c && this.depth < d) {
                                    this.devide();
                                    this.nodes[this.findInsertNode(a)].insert(a);
                                } else {
                                    this.items.push(a);
                                }
                            }
                        },
                        findInsertNode: function (a) {
                            return a.x < this.x + this.w / 2 ? a.y < this.y + this.h / 2 ? 0 : 2 : a.y < this.y + this.h / 2 ? 1 : 3
                        },
                        findOverlappingNodes: function (a, b) {
                            return a.x < this.x + this.w / 2 && (a.y < this.y + this.h / 2 && b(0) || a.y >= this.y + this.h / 2 && b(2)) || a.x >= this.x + this.w / 2 && (a.y < this.y + this.h / 2 && b(1) || a.y >= this.y + this.h / 2 && b(3)) ? true : false
                        },
                        devide: function () {
                            var a = this.depth + 1,
                                c = this.w / 2,
                                d = this.h / 2;
                            this.nodes.push(new Node(this.x, this.y, c, d, a));
                            this.nodes.push(new Node(this.x + c, this.y, c, d, a));
                            this.nodes.push(new Node(this.x, this.y + d, c, d, a));
                            this.nodes.push(new Node(this.x + c, this.y + d, c, d, a));
                            a = this.items;
                            this.items = [];
                            for (c = 0; c < a.length; c++) this.insert(a[c])
                        },
                        clear: function () {
                            for (var a = 0; a < this.nodes.length; a++) this.nodes[a].clear();
                            this.items.length = 0;
                            this.nodes.length = 0
                        }
                    };
                    var internalSelector = {
                        x: 0,
                        y: 0,
                        w: 0,
                        getNameSize: 0
                    };
                    return {
                        root: new Node(args.minX, args.minY, args.maxX - args.minX, args.maxY - args.minY, 0),
                        insert: function (a) {
                            this.root.insert(a)
                        },
                        retrieve: function (a, b) {
                            this.root.retrieve(a, b)
                        },
                        retrieve2: function (a, b, c, d, callback) {
                            internalSelector.x = a;
                            internalSelector.y = b;
                            internalSelector.w = c;
                            internalSelector.getNameSize = d;
                            this.root.retrieve(internalSelector, callback)
                        },
                        exists: function (a) {
                            return this.root.exists(a)
                        },
                        clear: function () {
                            this.root.clear()
                        }
                    }
                }
            };
            wjQuery(function () {
                function renderFavicon() {
                    if (0 < playerCells.length) {
                        redCell.color = playerCells[0].color;
                        redCell.setName(playerCells[0].name);
                    }
                    ctx.clearRect(0, 0, 32, 32);
                    ctx.save();
                    ctx.translate(16, 16);
                    ctx.scale(.4, .4);
                    redCell.drawOneCell(ctx);
                    ctx.restore();
                    var favicon = document.getElementById("favicon"),
                        oldfavicon = favicon.cloneNode(true);
                    oldfavicon.setAttribute("href", Canvas.toDataURL("image/png"));
                    favicon.parentNode.replaceChild(oldfavicon, favicon)
                }

                var redCell = new Cell(0, 0, 0, 32, "#ED1C24", ""),
                    Canvas = document.createElement("canvas");
                Canvas.width = 32;
                Canvas.height = 32;
                var ctx = Canvas.getContext("2d");
                renderFavicon();
                setInterval(renderFavicon, 1E3)
            });
            wHandle.onload = gameLoop
        }
    }
//console.log(knownNameDict);
})(window, window.jQuery);
