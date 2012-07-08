// ==UserScript==
// @name Github-Diff-Expander
// @match https://github.com/*/commit/*
// @match https://github.com/*/pull/*
// @version 1.0
// ==/UserScript==

(function () {
    var codeGaps = findCodeGaps(),
        fileDoms = {};
    for (var i=0; i<codeGaps.length; ++i) {
        bindClick(codeGaps[i]);
    }

    function findCodeGaps () {
        var codeGaps = [],
            files = document.getElementById('files').getElementsByClassName('file');

        for (var i=0; i<files.length; ++i) {
            var fileLine = 0,
                lines = files[i].getElementsByTagName('tr');
            for (var j=0; j<lines.length; ++j) {
                var lineNumber = lines[j].getElementsByClassName('line_numbers')[1].firstChild.nodeValue.replace(/^\s+|\s+$/g, '');
                if ('...' === lineNumber) {
                    var fileLinks = files[i].getElementsByClassName('meta')[0].getElementsByClassName('minibutton')[0],
                        fileUrl = files[i].getElementsByClassName('meta')[0].getElementsByClassName('minibutton')[0].href,
                        nextLineNumber = lines[j+1].getElementsByClassName('line_numbers')[1].firstChild.nodeValue.replace(/^\s+|\s+$/g, '');

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
        }
        return codeGaps;
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
        var code = '';
        for (var i=codeGap.startLine; i<=codeGap.endLine; ++i) {
            var regex = new RegExp("<div class='line' id='LC"+i+"'>(.*)</div><div class='line' id='LC"+(i+1)+"'>", 'i'),
                match = dom.match(regex),
                line = match ? match[1] : '';
            var lineHtml = '<tr><td class="line_numbers">&nbsp;</td><td class="line_numbers">'+i+'</td><td class="gi diff-line"><pre class="line"></pre></td></tr>';
            code += ' ' + line + '\n';
        }
        return code;
    }
})();