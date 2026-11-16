/* globals describe, it */
"use strict";

var assert = require("assert");
var ContributionsHandler = require("../../app/routes/contributions");

function createHandler(updates) {
    var fakeDb = {
        collection: function() {
            return {
                update: function(query, doc, options, callback) {
                    updates.push(doc);
                    callback(null);
                },
                findOne: function(query, callback) {
                    callback(null, {
                        _id: 1
                    });
                }
            };
        }
    };
    return new ContributionsHandler(fakeDb);
}

function submit(body) {
    var updates = [];
    var handler = createHandler(updates);
    var rendered = null;
    var res = {
        render: function(view, data) {
            rendered = data;
        }
    };
    handler.handleContributionsUpdate({
        body: body,
        session: {
            userId: 1
        }
    }, res, function(err) {
        throw err;
    });
    return {
        rendered: rendered,
        updates: updates
    };
}

describe("ContributionsHandler.handleContributionsUpdate", function() {
    it("does not evaluate submitted input as code", function() {
        var originalExit = process.exit;
        var exitCalled = false;
        process.exit = function() {
            exitCalled = true;
        };
        try {
            var result = submit({
                preTax: "process.exit()",
                afterTax: "1",
                roth: "1"
            });
            assert.strictEqual(exitCalled, false);
            assert.strictEqual(result.rendered.updateError, "Invalid contribution percentages");
            assert.strictEqual(result.updates.length, 0);
        } finally {
            process.exit = originalExit;
        }
    });

    it("rejects non-integer and negative values", function() {
        ["1+1", "-1", "2.5", "", "10abc", "0x10", "1e1", "1000"].forEach(function(value) {
            var result = submit({
                preTax: value,
                afterTax: "0",
                roth: "0"
            });
            assert.strictEqual(result.rendered.updateError, "Invalid contribution percentages", value);
            assert.strictEqual(result.updates.length, 0, value);
        });
    });

    it("rejects non-string values", function() {
        var result = submit({
            preTax: ["1"],
            afterTax: "0",
            roth: "0"
        });
        assert.strictEqual(result.rendered.updateError, "Invalid contribution percentages");
    });

    it("rejects a single value above 30% with the limit message", function() {
        var result = submit({
            preTax: "31",
            afterTax: "0",
            roth: "0"
        });
        assert.strictEqual(result.rendered.updateError, "Contribution percentages cannot exceed 30 %");
        assert.strictEqual(result.updates.length, 0);
    });

    it("rejects totals above 30%", function() {
        var result = submit({
            preTax: "15",
            afterTax: "10",
            roth: "6"
        });
        assert.strictEqual(result.rendered.updateError, "Contribution percentages cannot exceed 30 %");
        assert.strictEqual(result.updates.length, 0);
    });

    it("saves valid integer contributions as numbers", function() {
        var result = submit({
            preTax: "10",
            afterTax: " 5 ",
            roth: "0"
        });
        assert.strictEqual(result.updates.length, 1);
        assert.strictEqual(result.updates[0].preTax, 10);
        assert.strictEqual(result.updates[0].afterTax, 5);
        assert.strictEqual(result.updates[0].roth, 0);
    });
});
