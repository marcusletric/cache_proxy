function Common() {
    'use strict';
    this.stringHash = function (s) {
        var hash = 0, i, l, character;
        if (s.length === 0) return hash;
        for (i = 0, l = s.length; i < l; i++) {
            character = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + character;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };
}

module.exports = new Common();
