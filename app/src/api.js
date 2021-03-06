define(["platform", "exceptions"], function(platform, exceptions) {
    var storage = platform.storage;

    var endpoint = "/soap4me";
    var SESSION_TOKEN_KEY = "session_token";
    var SESSION_EXPIRATION_KEY = "session_expire_date";
    var USERNAME_KEY = "username";
    var PASSWORD_KEY = "password";

    function setSession(token, expirationTime, username, password) {
        storage.set(SESSION_TOKEN_KEY, token);
        storage.set(SESSION_EXPIRATION_KEY, new Date().getTime() + expirationTime);
        storage.set(USERNAME_KEY, username);
        storage.set(PASSWORD_KEY, password);
    }

    function login(method) {
        function decorator(args) {
            var now = new Date().getTime();
            var expirationTime = parseFloat(storage.get(SESSION_EXPIRATION_KEY));

            if (isNaN(expirationTime) || now > (expirationTime - 5 * 60 * 1000)) {
                var username = storage.get(USERNAME_KEY);
                var password = storage.get(PASSWORD_KEY);

                if (username && password) {
                    return api.user.login(username, password)
                        .then(function() {
                            return method.call(api.shows, args);
                        });
                } else {
                    throw new exceptions.NotLogginedException();
                }
            }

            return method.call(api.shows, args);
        }

        return function() {
            return decorator.call(this, arguments);
        }
    }

    $.ajaxSetup({
        beforeSend: function(request) {
            request.setRequestHeader("x-api-token", storage.get(SESSION_TOKEN_KEY));
        }
    });

    var api = {
        user: {
            uri: endpoint + "/login",
            login: function(username, password) {
                console.log('API: loggining inвА¶');
                var now = new Date().getTime();
                var expirationTime = parseFloat(storage.get(SESSION_EXPIRATION_KEY));

                if (!expirationTime || now >= expirationTime) {
                    var data = {
                        "login": username,
                        "password": password
                    };

                    return $.post(
                        this.uri,
                        data,
                        function(data) {
                            if (data["ok"] === 1) {
                                var sessionToken = data["token"];
                                var till = data["till"];

                                if (sessionToken && till) {
                                    setSession(sessionToken, parseFloat(till), username, password)
                                }
                            }
                        },
                        "json"
                    );
                }
            }
        },

        shows: {
            allShowsUri: endpoint + "/api/soap",
            favoritedShowsUri: endpoint + "/api/soap/my",

            all: login(function() {
                return $.getJSON(this.allShowsUri);
            }),

            favorites: login(function() {
                return $.getJSON(this.favoritedShowsUri);
            })
        }
    };

    return api;
});