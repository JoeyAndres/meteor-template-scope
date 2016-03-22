Package.describe({
    name: "jandres:template-scope",
    summary: "Replication of the angular's $scope mechanism.",
    version: "0.1.0-alpha2",
    git: "https://github.com/JoeyAndres/meteor-template-scope.git"
});

Package.onUse(function(api) {
    api.versionsFrom("1.2.1");

    api.use([
        "jandres:template-extension@4.0.4",
        'underscore',
        'templating',
        'jquery',
        'ecmascript'
    ], 'client');

    api.addFiles([
        'lib/lib.js',
        'lib/scope.js',
        'lib/scope-polyfill.js'
    ], 'client');

    api.export('$Scope');
    api.export('$rootScope');
});

Package.onTest(function(api) {
    api.use('jandres:template-scope@0.1.0-alpha2');
    api.use('sanjo:jasmine@0.20.3');

    api.use([
        "jandres:template-extension@4.0.4",
        'underscore',
        'templating',
        'jquery',
        'ecmascript',
        'tracker'
    ], 'client');

    api.addFiles([
        'tests/utils.js',
        'tests/templates.html',

        'tests/scope.js',
        'tests/static-templates.js',
        'tests/dynamic-templates.js'
    ], 'client');
});