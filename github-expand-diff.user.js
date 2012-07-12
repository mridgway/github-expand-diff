// ==UserScript==
// @name Github Diff Expander
// @match https://github.com/*/commit/*
// @match https://github.com/*/pull/*
// @version 1.0
// ==/UserScript==

(function () {
    var codeGaps = findCodeGaps(),
        fileDoms = {},
        parseNode = createParseNode(),
        LOADING_HTML = '<span style="font-size: 1.6em">&#8987;</span> Loading...';

    for (var i=0; i<codeGaps.length; ++i) {
        bindClick(codeGaps[i]);
    }

    function createParseNode () {
        var parseNode = document.createElement('span');
        parseNode.style.display = 'none';
        parseNode.id = 'gde-parseNode';
        return parseNode;
    }

    function findCodeGaps () {
        var codeGaps = [],
            files = getFileNodes();

        for (var i=0; i<files.length; ++i) {
            var fileLine = 0,
                lines = getLineNodes(files[i]),
                fileUrl = getFileUrl(files[i]),
                lastLineNode = createLastLineNode(files[i]);

            for (var j=0; j<lines.length; ++j) {
                var lineNumber = getLineNumber(lines[j]);
                if ('...' === lineNumber) {
                    var nextLineNumber = getLineNumber(lines[j+1]);

                    codeGaps.push({
                        lineNode: lines[j],
                        startLine: fileLine + 1,
                        endLine: parseInt(nextLineNumber, 10) - 1,
                        fileUrl: fileUrl
                    });
                } else {
                    fileLine = parseInt(lineNumber, 10);
                }
            }
            files[i].getElementsByTagName('tbody')[0].appendChild(lastLineNode);
            codeGaps.push({
                lineNode: lastLineNode,
                startLine: fileLine + 1,
                fileUrl: fileUrl
            });
        }
        return codeGaps;
    }

    function getFileNodes () {
        var fileNodes = [],
            filesNode = document.getElementById('files');
        if (filesNode) {
            fileNodes = filesNode.getElementsByClassName('file');
        }
        return fileNodes;
    }

    function getLineNodes (fileNode) {
        var lines = fileNode.getElementsByTagName('tr');
        return lines;
    }

    function getFileUrl (fileNode) {
        var metaNodes = fileNode.getElementsByClassName('meta'),
            miniButtonNodes;

        if (!metaNodes) {
            return null;
        }

        miniButtonNodes = metaNodes[0].getElementsByClassName('minibutton');

        if (!miniButtonNodes) {
            return null;
        }

        return miniButtonNodes[0].href;
    }

    function createLastLineNode () {
        var lastLineNode = document.createElement('tr');
        lastLineNode.innerHTML = '<td class="line_numbers">...</td><td class="line_numbers">...</td><td class="gc diff-line"><pre class="line"></pre></td>';
        return lastLineNode;
    }

    function getLineNumber (lineNode) {
        var lineNumbers;

        if (!lineNode) {
            return null;
        }

        lineNumbers = lineNode.getElementsByClassName('line_numbers');
        if (lineNumbers && lineNumbers.length > 1) {
            return lineNumbers[1].firstChild.nodeValue.replace(/^\s+|\s+$/g, '');
        }
        return null;
    }

    function bindClick (codeGap) {
        codeGap.lineNode.onclick = function (e) {
            var code,
                codeNode = codeGap.lineNode.getElementsByClassName('line')[0];
            e.preventDefault();
            e.stopPropagation();

            if (codeGap.open) {
                codeNode.innerHTML = codeGap.oldLine;
                codeGap.open = false;
            } else {
                codeGap.oldLine = codeNode.innerHTML;
                codeNode.innerHTML = LOADING_HTML;
                getCode(codeGap, function (code) {
                    codeNode.innerHTML = codeGap.newLine = code;
                });
                codeGap.open = true;
            }
        };
    }

    function getCode (codeGap, cb) {
        if (!fileDoms[codeGap.fileUrl]) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (4 === xhr.readyState) {
                    var response = xhr.responseText.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
                    fileDoms[codeGap.fileUrl] = response;
                    cb(parseDom(codeGap, fileDoms[codeGap.fileUrl]));
                }
            };
            xhr.open('GET', codeGap.fileUrl, true);
            xhr.send();
        } else {
            cb(parseDom(codeGap, fileDoms[codeGap.fileUrl]));
        }
    }

    function parseDom (codeGap, dom) {
        var code = '',
            domParseNode;

        parseNode.innerHTML = dom;
        domParseNode = document.body.appendChild(parseNode);
        if (undefined === codeGap.endLine) {
            var lastLineRegex = /([0-9]*) lines \(([0-9]*) sloc\)/i,
                file = domParseNode.getElementsByClassName('file')[0],
                metaNode = file.getElementsByClassName('meta')[0];
            codeGap.endLine = metaNode.innerHTML.match(lastLineRegex)[1];
        }
        for (var i=codeGap.startLine; i<=codeGap.endLine; ++i) {
            var lineNode = document.getElementById('LC' + i),
                line = lineNode ? lineNode.innerHTML : '';
            code += ' ' + line + '\n';
        }
        document.body.removeChild(domParseNode);
        parseNode.innerHTML = '';
        return code;
    }

    function logTime () {
        console.log((new Date()).getTime());
    }
})();