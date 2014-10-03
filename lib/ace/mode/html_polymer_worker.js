define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var lang = require("../lib/lang");
var Mirror = require("../worker/mirror").Mirror;

var Worker = exports.Worker = function(sender) {
    Mirror.call(this, sender);
    this.setTimeout(400);
    this.context = null;
};

oop.inherits(Worker, Mirror);

(function() {

    this.setOptions = function(options) {
        this.context = options.context;
    };

    this.inArray = function(array, value) {
        var match = false;
        array.forEach(function(val) {
            if (val === value) match = true;
        });
        return match;
    };

    this.getLineNumber = function(doc, code) {
      var lines = doc.getAllLines();
      var lineNumbers = [];
      for (var i = 0, l = lines.length; i < l; i++) {
        if (lines[i].indexOf(code) != -1) lineNumbers.push(i)
      }
      return lineNumbers[lineNumbers.length - 1];
    };

    this.onUpdate = function() {
        var value = this.doc.getValue();
        var annotations = [];
        var that = this;
        if (!value) return;

        // Scan import tags
        var regex = new RegExp("<link.*rel=\"import\".*>", "mig");
        var imports = [];
        var importMatches = value.match(regex);

        // Scan custom elements
        var regex = new RegExp("<[A-Za-z]*-[A-Za-z]*.*>", "mig");
        var elements = [];
        var elementMatches = value.match(regex);

        if (importMatches) {
            importMatches.forEach(function(import) {
                var importTag = /href=".*\/(.*-.*)\.html"/.exec(import);
                if (importTag[1]) imports.push(importTag[1]);
            });
        }

        if (elementMatches) {
            elementMatches.forEach(function(element) {
                var elementTag = /<([\w-]*)/.exec(element);
                if (!elementTag[1] || elementTag[1] === 'polymer-element') return;
                elementTag = elementTag[1];
                elements.push(elementTag);

                if (!that.inArray(imports, elementTag)) {
                    annotations.push({ row: that.getLineNumber(that.doc, element), text: "No HTML import found for " + elementTag + " element.", type: "warning" });
                }
            });
        }

        if (importMatches) {
            importMatches.forEach(function(importMatch) {
                var importTag = /href=".*\/(.*-.*)\.html"/.exec(importMatch);
                if (importTag[1]) {
                    if (!that.inArray(elements, importTag[1])) {
                        annotations.push({ row: that.getLineNumber(that.doc, importMatch), text: "HTML import " + importTag[1] + " is unused.", type: "warning" });
                    }   
                }
            });
        }

        this.sender.emit("import", annotations);
    };

}).call(Worker.prototype);

});