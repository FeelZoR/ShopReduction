/*:
 * @plugindesc v1.0.0 Allow to make items cheaper or more extensive on a per-shop basis.
 * @author Feelzor
 *
 * @help
 *
 * ============================================================================
 * Plugin commands
 * ============================================================================
 *
 * Reduction ADD:
 *   This command allows to change the price of items sold / bought.
 *
 *   Usage: Reduction ADD <shop> <action> <formula>
 *       Shop: can be either global, this or the id of the event that will show
 *       the shop.
 *         “global” is used to change the prices of ALL the shops,
 *         and is applied after the per-shop price modifications.
 *         “this” is a shortcut that targets the current event.
 *         If you use the id of the event, you should also specify the id of
 *         the map. (e.g. 4 1 will target the event with id 4 in map with id 1)
 *       Action: can be either BUY or SELL.
 *         “BUY” will change the prices of the items the player will buy.
 *         “SELL” will change the prices of the items the player will sell.
 *       Formula: the formula to apply when changing the prices.
 *         You can either add a predefined price or add a percentage.
 *         e.g. “+5%”, “-10” will respectively add 5% to the price or remove 10
 *         to the price.
 *
 *   Examples:
 *       - Reduction ADD global BUY +10% will increase the prices of all items
 *       sold by shops by 10%
 *       - Reduction ADD this SELL -10 will reduce the prices of all items sold
 *       by the current event by 10G (or whatever currency you use).
 *       - Reduction ADD 14 3 BUY +10% +5 will increase the prices of all items
 *       sold by the event with id 14 in map with id 3 by 10% then add 5G more.
 *
 *   Warning:
 *      There can be only ONE global rule. Using “Reduction ADD global” will
 *      overwrite any previous global rule.
 *
 * Reduction REMOVE:
 *   This command allows to remove the price changes of shops.
 *
 *   Alias: RESET
 *
 *   Usages:
 *   - Reduction REMOVE <shop> <action> [mapId]
 *   - Reduction REMOVE ALL (this command will remove all the changes of all
 *     events and the global changes too)
 *      Shop: can be either global, this or the id of the event that will show
 *      the shop.
 *      Action: can be either BUY, SELL or ALL.
 *        “ALL“ will remove both BUY and SELL rules.
 *      MapId: The id of the map the event is located in.
 *        It only works when the shop is NEITHER “global” NOR “this”. It
 *        defaults on the current map.
 *
 *   Examples:
 *      - Reduction RESET ALL will remove all existing rules.
 *      - Reduction REMOVE global BUY will remove the BUY global rule.
 *      - Reduction REMOVE this ALL will remove both BUY and SELL rules for the
 *      current event.
 *      - Reduction REMOVE 5 SELL will remove the SELL rule of the event with
 *      id 5 in the current map.
 *      - Reduction REMOVE 29 BUY 7 will remove the BUY rule of the event with
 *      id 29 in the map with id 7.
 *
 */

var FLZ = FLZ || {};
FLZ.ShopReduction = FLZ.ShopReduction || {};

(function(_) {
    "use strict";

    function resetAllReductions() {
        _.globalChange = {};
        _.eventChange = {};
        _.currentShopChange = null;
    }

    resetAllReductions();

    /**
     * Replace a char at a given position by the replacement string
     * @param {Number} index The index of the char to remove
     * @param {String} replacement The string to put instead of that char
     * @param {String} string The string in which to change the char
     * @param {Number} length The number of characters to replace
     * @returns {String} The resulting string
     */
    function replaceCharAt(index, replacement, string, length) {
        if (typeof length === "undefined") length = 1;
        return string.substring(0, index) + replacement + string.substring(index + length);
    }

    function ShopReduction() {
        throw new Error("This is a static class");
    }

    /**
     * Reset global rule
     * @param {String} type Which rule to delete (BUY, SELL or ALL)
     */
    ShopReduction.resetGlobal = function(type) {
        if (type.toLowerCase() === "all") {
            _.globalChange = {};
            return;
        }

        ShopReduction.reset(_.globalChange, type);
    };

    /**
     * Reset event rule
     * @param {String} id The id of the event to reset, following the "eventId.mapId" rule.
     * @param {String} type Which rule to delete (BUY, SELL or ALL)
     */
    ShopReduction.resetEventId = function(id, type) {
        if (type.toLowerCase() === "all") {
            delete _.eventChange[id];
            return;
        }

        ShopReduction.reset(_.eventChange[id], type);
    };

    /**
     * Get the price of the current item
     * @param {Number} initialPrice The initial price of the item, before any modification
     * @param {String} change The event rule. Can be null or undefined.
     * @param {String} global The global rule. Can be null or undefined.
     * @returns {Number} The new price after all modifications.
     */
    ShopReduction.getPrice = function(initialPrice, change, global) {
        if (change == null) change = "";
        if (global == null) global = "";

        return Math.max(Math.floor(eval(ShopReduction.getCalculation(String(initialPrice) + change + global))), 0);
    };

    const FLZ_ShopReduction_Game_Interpreter_command302 = Game_Interpreter.prototype.command302;
    Game_Interpreter.prototype.command302 = function() { // Shop Processing
        _.currentShopChange = _.eventChange[this._eventId + '.' + this._mapId] || {};
        FLZ_ShopReduction_Game_Interpreter_command302.call(this);
    };

    const FLZ_ShopReduction_Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        FLZ_ShopReduction_Game_Interpreter_pluginCommand.call(this, command, args);
        let mapId = this._mapId;
        let eventId = null;
        if (command.toLowerCase() === "reduction" && args.length >= 2) {
            switch (args[0].toLowerCase()) {
            case "add":
                if (args.length >= 4) {
                    switch (args[1].toLowerCase()) {
                    case 'global':
                        _.globalChange[args[2].toLowerCase()] = args.slice(3).join('');
                        break;
                    case 'this':
                        eventId = this._eventId + "." + mapId;
                        if (typeof _.eventChange[eventId] === "undefined") _.eventChange[eventId] = {}; // Create the event rule if it doesn't exist
                        _.eventChange[eventId][args[2].toLowerCase()] = args.slice(3).join('');
                        break;
                    default:
                        eventId = args[1] + "." + args[2];
                        if (typeof _.eventChange[eventId] === "undefined") _.eventChange[eventId] = {}; // Create the event rule if it doesn't exist
                        _.eventChange[eventId][args[3].toLowerCase()] = args.slice(4).join('');
                        break;
                    }
                }
                break;
            case "remove": case "reset":
                if (args[1].toLowerCase() === "all") resetAllReductions();
                else if (args.length >= 3) {
                    switch (args[1].toLowerCase()) {
                    case 'global':
                        ShopReduction.resetGlobal(args[2]);
                        break;
                    case 'this':
                        ShopReduction.resetEventId(this._eventId + "." + mapId, args[2]);
                        break;
                    default:
                        if (args[3] != null) mapId = args[3];
                        ShopReduction.resetEventId(args[1] + "." + mapId, args[2]);
                        break;
                    }
                }
                break;
            }
        }
    };

    // Change the price of the items SOLD by the SHOP (the player will buy them)
    const FLZ_ShopReduction_Window_ShopBuy_price = Window_ShopBuy.prototype.price;
    Window_ShopBuy.prototype.price = function(item) {
        return ShopReduction.getPrice(FLZ_ShopReduction_Window_ShopBuy_price.call(this, item), _.currentShopChange.buy, _.globalChange.buy);
    };

    // Change the price of the items SOLD by the PLAYER.
    const FLZ_ShopReduction_Scene_Shop_sellingPrice = Scene_Shop.prototype.sellingPrice;
    Scene_Shop.prototype.sellingPrice = function() {
        return ShopReduction.getPrice(FLZ_ShopReduction_Scene_Shop_sellingPrice.call(this), _.currentShopChange.sell,  _.globalChange.sell);
    };

    /**
     * Gets the calculation for the new price
     * @param {String} expression The expression to change
     * @returns {String} The evaluable calculation that will give the right price
     */
    ShopReduction.getCalculation = function(expression) {
        let percentPos;
        expression = expression.replace(/\s/ig, '');

        while ((percentPos = expression.indexOf("%")) !== -1) {
            let tempExpr = expression.substring(0, percentPos);
            let lastTokenPos = Math.max(tempExpr.lastIndexOf('+'), tempExpr.lastIndexOf('-'));
            if (expression.charAt(lastTokenPos) === '+')
                expression = replaceCharAt(lastTokenPos, '*', expression, 1);
            else
                expression = replaceCharAt(lastTokenPos, '/', expression, 1);

            let percentValue = expression.substring(lastTokenPos + 1, percentPos);
            let value = String((Number(percentValue) / 100) + 1);

            expression = replaceCharAt(lastTokenPos + 1, value, expression, percentValue.length);
            let endOfExpr = expression.substring(lastTokenPos);
            expression = '(' + expression.substring(0, lastTokenPos) + ')'
                + replaceCharAt(endOfExpr.indexOf('%'), '', endOfExpr, 1);
        }

        return expression;
    };

    /**
     * Resets a rule
     * @param element The element containing the rule to be removed
     * @param type The type of rule to reset (either BUY or SELL)
     */
    ShopReduction.reset = function(element, type) {
        if (element == null) return;
        delete element[type.toLowerCase()];
    };

    const FLZ_ShopReduction_DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        var contents = FLZ_ShopReduction_DataManager_makeSaveContents.call(this);
        contents.globalShopReduction = _.globalChange;
        contents.eventsShopReduction = _.eventChange;
        return contents;
    };

    const FLZ_ShopReduction_DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        FLZ_ShopReduction_DataManager_extractSaveContents.call(this, contents);
        _.globalChange = contents.globalShopReduction || {};
        _.eventChange = contents.eventsShopReduction || {};
    };

    const FLZ_ShopReduction_DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        FLZ_ShopReduction_DataManager_setupNewGame.call(this);
        resetAllReductions();
    }

})(FLZ.ShopReduction);