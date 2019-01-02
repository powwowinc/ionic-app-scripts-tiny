import * as bundle from './bundle';
import * as webpack from './webpack';
import * as Constants from './util/constants';
import { ChangedFile } from './util/interfaces';

describe('bundle task', () => {

  describe('bundle', () => {

    it('should return the value webpack task returns', () => {
      // arrange
      spyOn(webpack, webpack.webpack.name).and.returnValue(Promise.resolve());
      const context = { bundler: Constants.BUNDLER_WEBPACK};

      // act
      return bundle.bundle(context).then(() => {
        // assert
        expect(webpack.webpack).toHaveBeenCalled();
      });
    });

    it('should throw when webpack throws', () => {
      const errorText = 'simulating an error';
      // arrange
      spyOn(webpack, webpack.webpack.name).and.returnValue(Promise.reject(new Error(errorText)));
      const context = { bundler: Constants.BUNDLER_WEBPACK};

      // act
      return bundle.bundle(context).then(() => {
        throw new Error('Should never happen');
      }).catch(err => {
        // assert
        expect(webpack.webpack).toHaveBeenCalled();
        expect(err.message).toBe(errorText);
      });
    });
  });

  describe('buildJsSourceMaps', () => {

    it('should get false when devtool is null for webpack', () => {
      // arrange
      const config = { };
      spyOn(webpack, webpack.getWebpackConfig.name).and.returnValue(config);
      const context = { bundler: Constants.BUNDLER_WEBPACK};
      // act
      const result = bundle.buildJsSourceMaps(context);

      // assert
      expect(webpack.getWebpackConfig).toHaveBeenCalledWith(context, null);
      expect(result).toEqual(false);
    });

  });

});
