/*!
 *  Lang.js for Laravel localization in JavaScript.
 *
 *  @version 1.1.0
 *  @license MIT
 *  @site    https://github.com/rmariuzzo/Laravel-JS-Localization
 *  @author  rmariuzzo
 */

'use strict';

(function(root, factory) {

    if (typeof define === 'function' && define.amd) {
        // AMD support.
        define([], factory);
    } else if (typeof exports === 'object') {
        // NodeJS support.
        module.exports = new(factory())();
    } else {
        // Browser global support.
        root.Lang = new(factory())();
    }

}(this, function() {

    // Default options //

    var defaults = {
        defaultLocale: 'en' /** The default locale if not set. */
    };

    // Constructor //

    var Lang = function(options) {
        options = options || {};
        this.defaultLocale = options.defaultLocale || defaults.defaultLocale;
    };

    // Methods //

    /**
     * Set messages source.
     *
     * @param messages {object} The messages source.
     *
     * @return void
     */
    Lang.prototype.setMessages = function(messages) {
        this.messages = messages;
    };

    /**
     * Returns a translation message.
     *
     * @param key {string} The key of the message.
     * @param replacements {object} The replacements to be done in the message.
     *
     * @return {string} The translation message, if not found the given key.
     */
    Lang.prototype.get = function(key, replacements) {
        if (!this.has(key)) {
            return key;
        }

        var message = this._getMessage(key, replacements);
        if (message === null) {
            return key;
        }

        if (replacements) {
            message = this._applyReplacements(message, replacements);
        }

        return message;
    };

    /**
     * Returns true if the key is defined on the messages source.
     *
     * @param key {string} The key of the message.
     *
     * @return {boolean} true if the given key is defined on the messages source, otherwise false.
     */
    Lang.prototype.has = function(key) {
        if (typeof key !== 'string' || !this.messages) {
            return false;
        }
        return this._getMessage(key) !== null;
    };

    /**
     * Gets the plural or singular form of the message specified based on an integer value.
     *
     * @param key {string} The key of the message.
     * @param count {integer} The number of elements.
     * @param replacements {object} The replacements to be done in the message.
     *
     * @return {string} The translation message according to an integer value.
     */
    Lang.prototype.choice = function(key, count, replacements) {
        // Set default values for parameters replace and locale
        replacements = typeof replacements !== 'undefined' ? replacements : {};
        
        // The count must be replaced if found in the message
        replacements['count'] = count;

        // Message to get the plural or singular
        var message = this.get(key, replacements);

        // Check if message is not null or undefined
        if (message === null || message === undefined) {
            return message;
        }

        // Separate the plural from the singular, if any
        var messageParts = message.split('|');

        // Get the explicit rules, If any
        var explicitRules = [];
        var regex = /{\d+}\s(.+)|\[\d+,\d+\]\s(.+)|\[\d+,Inf\]\s(.+)/;

        for (var i = 0; i < messageParts.length; i++) {
            messageParts[i] = messageParts[i].trim();

            if (regex.test(messageParts[i])) {
                var messageSpaceSplit = messageParts[i].split(/\s/);
                explicitRules.push(messageSpaceSplit.shift());
                messageParts[i] = messageSpaceSplit.join(' ');
            }
        }

        // Check if there's only one message
        if (messageParts.length === 1) {
            // Nothing to do here
            return message;
        }

        // Check the explicit rules
        for (var i = 0; i < explicitRules.length; i++) {
            if (this._testInterval(count, explicitRules[i])) {
                return messageParts[i];
            }
        }

        // Standard rules
        if (count > 1) {
            return messageParts[1];
        } else {
            return messageParts[0];
        }
    };

    /**
     * Set the current locale.
     *
     * @param locale {string} The locale to set.
     *
     * @return void
     */
    Lang.prototype.setLocale = function(locale) {
        this.locale = locale;
    };

    /**
     * Get the current locale.
     *
     * @return {string} The current locale.
     */
    Lang.prototype.getLocale = function() {
        return this.locale || this.defaultLocale;
    };

    /**
     * Parse a message key into components.
     *
     * @param key {string} The message key to parse.
     *
     * @return {object} A key object with source and entries properties.
     */
    Lang.prototype._parseKey = function(key) {
        if (typeof key !== 'string') {
            return null;
        }
        var segments = key.split('.');
        return {
            source: this.getLocale() + '.' + segments[0],
            entries: segments.slice(1)
        };
    };

    /**
     * Returns a translation message. Use `Lang.get()` method instead, this methods assumes the key exists.
     *
     * @param key {string} The key of the message.
     *
     * @return {string} The translation message for the given key.
     */
    Lang.prototype._getMessage = function(key) {

        key = this._parseKey(key);

        // Ensure message source exists.
        if (this.messages[key.source] === undefined) {
            return null;
        }

        // Get message text.
        var message = this.messages[key.source];
        while (key.entries.length && (message = message[key.entries.shift()]));

        if (typeof message !== 'string') {
            return null;
        }

        return message;
    };

    /**
     * Apply replacements to a string message containing placeholders.
     *
     * @param message {string} The text message.
     * @param replacements {object} The replacements to be done in the message.
     *
     * @return {string} The string message with replacements applied.
     */
    Lang.prototype._applyReplacements = function(message, replacements) {
        for (var replace in replacements) {
            message = message.split(':' + replace).join(replacements[replace]);
        }
        return message;
    };

    /**
     * Checks if the given `count` is within the interval defined by the {string} `interval`
     *
     * @param  count {int}  The amount of items.
     * @param  interval {string}    The interval to be compared with the count.
     * @return {boolean}    Returns true if count is within interval; false otherwise.
     */
    Lang.prototype._testInterval = function(count, interval) {
        /**
         * From the Symfony\Component\Translation\Interval Docs
         *
         * Tests if a given number belongs to a given math interval.
         * An interval can represent a finite set of numbers: {1,2,3,4}
         * An interval can represent numbers between two numbers: [1, +Inf] ]-1,2[
         * The left delimiter can be [ (inclusive) or ] (exclusive).
         * The right delimiter can be [ (exclusive) or ] (inclusive).
         * Beside numbers, you can use -Inf and +Inf for the infinite.
         */

        var numbers = [];
        var strCount = ""+count;


        if(/\{(.+)}/.test(interval)){
            numbers = interval.replace('{', '').replace('}', '').split(',');

            if(numbers.indexOf(strCount) >= 0){
                return true
            }
        }

        if(/(\[|\()(.+)(\]|\))/.test(interval)){
            var linc = interval.indexOf("(") >= 0;
            var rinc = interval.indexOf(")") >= 0;

            numbers = interval.replace(/(\[|\(|\]|\))/g, '').split(/,\s*/);
            
            var n0 = numbers[0];
            var n1 = numbers[1];

            if(!/Inf|-Inf|\+Inf/gi.test(numbers[0])){
                n0 = Number.parseInt(numbers[0]);
            }

            if(!/Inf|-Inf|\+Inf/gi.test(numbers[1])){
                n1 = Number.parseInt(numbers[1]);
            }

            if((n0=='-Inf' ||(linc && count > n0) || (!linc && count >= n0)) && ((n1=='Inf' || n1=='+Inf') || (rinc && count < n1) || (!rinc && count <= n1))){
                return true;
            }
        }

        return false;
    };

    return Lang;

}));


(function(root) {
    Lang.setMessages({"en.slackin":{"join":"Join on :team on Slack","users_online":"{0} There is no online users of <b class=\"users-total\">:total<\/b> registred.|{1} There is <b class=\"users-online\">:active<\/b> online user of <b class=\"users-total\">:total<\/b> registred.|[2,Inf] There are <b class=\"users-online\">:active<\/b> online users online of <b class=\"users-total\">:total<\/b> registred.","placeholders":{"username":"Enter your name and last name","email":"example@example.com"},"submit":"Join","invited":"Invitation sent, please verify your inbox mail!"},"en.validation":{"accepted":"The :attribute must be accepted.","active_url":"The :attribute is not a valid URL.","after":"The :attribute must be a date after :date.","alpha":"The :attribute may only contain letters.","alpha_dash":"The :attribute may only contain letters, numbers, and dashes.","alpha_num":"The :attribute may only contain letters and numbers.","array":"The :attribute must be an array.","before":"The :attribute must be a date before :date.","between":{"numeric":"The :attribute must be between :min and :max.","file":"The :attribute must be between :min and :max kilobytes.","string":"The :attribute must be between :min and :max characters.","array":"The :attribute must have between :min and :max items."},"boolean":"The :attribute field must be true or false.","confirmed":"The :attribute confirmation does not match.","date":"The :attribute is not a valid date.","date_format":"The :attribute does not match the format :format.","different":"The :attribute and :other must be different.","digits":"The :attribute must be :digits digits.","digits_between":"The :attribute must be between :min and :max digits.","email":"The :attribute must be a valid email address.","filled":"The :attribute field is required.","exists":"The selected :attribute is invalid.","image":"The :attribute must be an image.","in":"The selected :attribute is invalid.","integer":"The :attribute must be an integer.","ip":"The :attribute must be a valid IP address.","max":{"numeric":"The :attribute may not be greater than :max.","file":"The :attribute may not be greater than :max kilobytes.","string":"The :attribute may not be greater than :max characters.","array":"The :attribute may not have more than :max items."},"mimes":"The :attribute must be a file of type: :values.","min":{"numeric":"The :attribute must be at least :min.","file":"The :attribute must be at least :min kilobytes.","string":"The :attribute must be at least :min characters.","array":"The :attribute must have at least :min items."},"not_in":"The selected :attribute is invalid.","numeric":"The :attribute must be a number.","regex":"The :attribute format is invalid.","required":"The :attribute field is required.","required_if":"The :attribute field is required when :other is :value.","required_with":"The :attribute field is required when :values is present.","required_with_all":"The :attribute field is required when :values is present.","required_without":"The :attribute field is required when :values is not present.","required_without_all":"The :attribute field is required when none of :values are present.","same":"The :attribute and :other must match.","size":{"numeric":"The :attribute must be :size.","file":"The :attribute must be :size kilobytes.","string":"The :attribute must be :size characters.","array":"The :attribute must contain :size items."},"unique":"The :attribute has already been taken.","url":"The :attribute format is invalid.","timezone":"The :attribute must be a valid zone.","wrong":"Something went wrong.","custom":{"attribute-name":{"rule-name":"custom-message"}},"attributes":{"username":"nome","email":"e-mail"}},"pt-br.slackin":{"join":"Entre no Slack do <b class=\"team-name\">:team<\/b>.","users_online":"{0} Nenhum usu\u00e1rio online de <b class=\"users-total\">:total<\/b> registrados.|{1} H\u00e1 <b class=\"users-online\">:active<\/b> usu\u00e1rio online de <b class=\"users-total\">:total<\/b> registrados.|[2,Inf] H\u00e1 <b class=\"users-online\">:active<\/b> usu\u00e1rios online de <b class=\"users-total\">:total<\/b> registrados.","placeholders":{"username":"Digite seu nome e sobrenome","email":"exemplo@exemplo.com"},"submit":"Entrar","invited":"Convite enviado, por favor verifique sua caixa de email!"},"pt-br.validation":{"accepted":"O campo :attribute deve ser aceito.","active_url":"O campo :attribute n\u00e3o cont\u00e9m um URL v\u00e1lido.","after":"O campo :attribute dever\u00e1 conter uma data posterior a :date.","alpha":"O campo :attribute dever\u00e1 conter apenas letras.","alpha_dash":"O campo :attribute dever\u00e1 conter apenas letras, n\u00fameros e tra\u00e7os.","alpha_num":"O campo :attribute dever\u00e1 conter apenas letras e n\u00fameros .","array":"O campo :attribute precisa ser um conjunto.","before":"O campo :attribute dever\u00e1 conter uma data anterior a :date.","between":{"numeric":"O campo :attribute dever\u00e1 ter um valor entre :min - :max.","file":"O campo :attribute dever\u00e1 ter um tamanho entre :min - :max kilobytes.","string":"O campo :attribute dever\u00e1 conter entre :min - :max caracteres.","array":"O campo :attribute precisar ter entre :min - :max itens."},"boolean":"O campo :attribute dever\u00e1 ter o valor verdadeiro ou falso.","confirmed":"A confirma\u00e7\u00e3o para o campo :attribute n\u00e3o coincide.","date":"O campo :attribute n\u00e3o cont\u00e9m uma data v\u00e1lida.","date_format":"A data indicada para o campo :attribute n\u00e3o respeita o formato :format.","different":"Os campos :attribute e :other dever\u00e3o conter valores diferentes.","digits":"O campo :attribute dever\u00e1 conter :digits d\u00edgitos.","digits_between":"O campo :attribute dever\u00e1 conter entre :min a :max d\u00edgitos.","email":"O campo :attribute n\u00e3o cont\u00e9m um endere\u00e7o de email v\u00e1lido.","exists":"O valor selecionado para o campo :attribute \u00e9 inv\u00e1lido.","filled":"\u00c9 obrigat\u00f3ria a indica\u00e7\u00e3o de um valor para o campo :attribute.","image":"O campo :attribute dever\u00e1 conter uma imagem.","in":"O campo :attribute n\u00e3o cont\u00e9m um valor v\u00e1lido.","integer":"O campo :attribute dever\u00e1 conter um n\u00famero inteiro.","ip":"O campo :attribute dever\u00e1 conter um IP v\u00e1lido.","max":{"numeric":"O campo :attribute n\u00e3o dever\u00e1 conter um valor superior a :max.","file":"O campo :attribute n\u00e3o dever\u00e1 ter um tamanho superior a :max kilobytes.","string":"O campo :attribute n\u00e3o dever\u00e1 conter mais de :max caracteres.","array":"O campo :attribute deve ter no m\u00e1ximo :max itens."},"mimes":"O campo :attribute dever\u00e1 conter um arquivo do tipo: :values.","min":{"numeric":"O campo :attribute dever\u00e1 ter um valor superior ou igual a :min.","file":"O campo :attribute dever\u00e1 ter no m\u00ednimo :min kilobytes.","string":"O campo :attribute dever\u00e1 conter no m\u00ednimo :min caracteres.","array":"O campo :attribute deve ter no m\u00ednimo :min itens."},"not_in":"O campo :attribute cont\u00e9m um valor inv\u00e1lido.","numeric":"O campo :attribute dever\u00e1 conter um valor num\u00e9rico.","regex":"O formato do valor para o campo :attribute \u00e9 inv\u00e1lido.","required":"\u00c9 obrigat\u00f3ria a indica\u00e7\u00e3o de um valor para o campo :attribute.","required_if":"\u00c9 obrigat\u00f3ria a indica\u00e7\u00e3o de um valor para o campo :attribute quando o valor do campo :other \u00e9 igual a :value.","required_with":"\u00c9 obrigat\u00f3ria a indica\u00e7\u00e3o de um valor para o campo :attribute quando :values est\u00e1 presente.","required_with_all":"\u00c9 obrigat\u00f3ria a indica\u00e7\u00e3o de um valor para o campo :attribute quando um dos :values est\u00e1 presente.","required_without":"\u00c9 obrigat\u00f3ria a indica\u00e7\u00e3o de um valor para o campo :attribute quanto :values n\u00e3o est\u00e1 presente.","required_without_all":"\u00c9 obrigat\u00f3ria a indica\u00e7\u00e3o de um valor para o campo :attribute quando nenhum dos :values est\u00e1 presente.","same":"Os campos :attribute e :other dever\u00e3o conter valores iguais.","size":{"numeric":"O campo :attribute dever\u00e1 conter o valor :size.","file":"O campo :attribute dever\u00e1 ter o tamanho de :size kilobytes.","string":"O campo :attribute dever\u00e1 conter :size caracteres.","array":"O campo :attribute deve ter :size itens."},"timezone":"O campo :attribute dever\u00e1 ter um fuso hor\u00e1rio v\u00e1lido.","unique":"O valor indicado para o campo :attribute j\u00e1 se encontra registrado.","url":"O formato do URL indicado para o campo :attribute \u00e9 inv\u00e1lido.","wrong":"Alguma coisa deu errado.","custom":{"attribute-name":{"rule-name":"custom-message"}},"attributes":{"username":"nome","email":"e-mail"}}});
})(window);
