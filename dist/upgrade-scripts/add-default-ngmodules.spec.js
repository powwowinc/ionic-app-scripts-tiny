"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var upgradeScript = require("./add-default-ngmodules");
var file_cache_1 = require("../util/file-cache");
var globUtil = require("../util/glob-util");
var helpers = require("../util/helpers");
describe('add default ngmodules upgrade script', function () {
    describe('getTsFilePaths', function () {
        it('should return a list of absolute file paths', function () {
            var srcDirectory = path_1.join('Users', 'noone', 'this', 'path', 'is', 'fake', 'src');
            var context = {
                srcDir: srcDirectory
            };
            var knownFileOne = path_1.join(srcDirectory, 'pages', 'page-one', 'page-one.ts');
            var knownFileTwo = path_1.join(srcDirectory, 'pages', 'page-two', 'page-two.ts');
            var knownFileThree = path_1.join(srcDirectory, 'pages', 'page-three', 'page-three.ts');
            var knownFileFour = path_1.join(srcDirectory, 'util', 'some-util.ts');
            var globResults = [
                { absolutePath: knownFileOne },
                { absolutePath: knownFileTwo },
                { absolutePath: knownFileThree },
                { absolutePath: knownFileFour },
            ];
            spyOn(globUtil, globUtil.globAll.name).and.returnValue(Promise.resolve(globResults));
            var promise = upgradeScript.getTsFilePaths(context);
            return promise.then(function (filePaths) {
                expect(filePaths.length).toEqual(4);
                expect(filePaths[0]).toEqual(knownFileOne);
                expect(filePaths[1]).toEqual(knownFileTwo);
                expect(filePaths[2]).toEqual(knownFileThree);
                expect(filePaths[3]).toEqual(knownFileFour);
            });
        });
    });
    describe('readTsFiles', function () {
        it('should read the ts files', function () {
            var context = {
                fileCache: new file_cache_1.FileCache()
            };
            var srcDirectory = path_1.join('Users', 'noone', 'this', 'path', 'is', 'fake', 'src');
            var knownFileOne = path_1.join(srcDirectory, 'pages', 'page-one', 'page-one.ts');
            var knownFileTwo = path_1.join(srcDirectory, 'pages', 'page-two', 'page-two.ts');
            var knownFileThree = path_1.join(srcDirectory, 'pages', 'page-three', 'page-three.ts');
            var knownFileFour = path_1.join(srcDirectory, 'util', 'some-util.ts');
            var fileList = [knownFileOne, knownFileTwo, knownFileThree, knownFileFour];
            spyOn(helpers, helpers.readFileAsync.name).and.callFake(function (filePath) {
                // just set the file content to the path name + 'content' to keep things simple
                return Promise.resolve(filePath + 'content');
            });
            var promise = upgradeScript.readTsFiles(context, fileList);
            return promise.then(function () {
                // the files should be cached now
                var fileOne = context.fileCache.get(knownFileOne);
                expect(fileOne.content).toEqual(knownFileOne + 'content');
                var fileTwo = context.fileCache.get(knownFileTwo);
                expect(fileTwo.content).toEqual(knownFileTwo + 'content');
                var fileThree = context.fileCache.get(knownFileThree);
                expect(fileThree.content).toEqual(knownFileThree + 'content');
                var fileFour = context.fileCache.get(knownFileFour);
                expect(fileFour.content).toEqual(knownFileFour + 'content');
            });
        });
    });
});
