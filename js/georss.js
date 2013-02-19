function use(packages) {
	packages = packages.split('.');
    var parent = window;

    for (var i=0; i < packages.length; i++) {
	    if(!(packages[i] in parent)) {
	        parent[packages[i]] = {};
        }
            parent = parent[packages[i]];
    }
}

function init() {
	new conwet.Gadget();
}

var _ = function(key) {
	return key;
}

