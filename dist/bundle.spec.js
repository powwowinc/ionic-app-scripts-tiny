"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bundle = require("./bundle");
var webpack = require("./webpack");
var Constants = require("./util/constants");
describe('bundle task', function () {
    describe('bundle', function () {
        it('should return the value webpack task returns', function () {
            // arrange
            spyOn(webpack, webpack.webpack.name).and.returnValue(Promise.resolve());
            var context = { bundler: Constants.BUNDLER_WEBPACK };
            // act
            return bundle.bundle(context).then(function () {
                // assert
                expect(webpack.webpack).toHaveBeenCalled();
            });
        });
        it('should throw when webpack throws', function () {
            var errorText = 'simulating an error';
            // arrange
            spyOn(webpack, webpack.webpack.name).and.returnValue(Promise.reject(new Error(errorText)));
            var context = { bundler: Constants.BUNDLER_WEBPACK };
            // act
            return bundle.bundle(context).then(function () {
                throw new Error('Should never happen');
            }).catch(function (err) {
                // assert
                expect(webpack.webpack).toHaveBeenCalled();
                expect(err.message).toBe(errorText);
            });
        });
    });
    describe('buildJsSourceMaps', function () {
        it('should get false when devtool is null for webpack', function () {
            // arrange
            var config = {};
            spyOn(webpack, webpack.getWebpackConfig.name).and.returnValue(config);
            var context = { bundler: Constants.BUNDLER_WEBPACK };
            // act
            var result = bundle.buildJsSourceMaps(context);
            // assert
            expect(webpack.getWebpackConfig).toHaveBeenCalledWith(context, null);
            expect(result).toEqual(false);
        });
    });
});
