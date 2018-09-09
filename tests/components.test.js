import { expect } from 'chai';
import path from 'path';
import extractComponent from '../dist/extractComponent';

function resolve (...paths) {
    return path.resolve(__dirname, './weappHelpers', ...paths);
}

function generatorEntries (pages) {
    if (!Array.isArray(pages)) {
        pages = [pages];
    }

    return pages.map(page => {
        // const _path = parse(page.path);
        return {
            context: page.context,
            assets: {
                [page.name]: {
                    source () {
                        return JSON.stringify(page.content);
                    }
                }
            }
        };
    });
}

function run (opts) {
    return new Promise ((res, rej) => {
        const compilation = Object.assign({
            assets: {},
            contextDependencies: [],
            errors: [],
            fileDependencies: [],
            options: {
                context: resolve()
            }
        }, opts.compilation);
        
        const patterns = extractComponent(compilation, opts.config);
            
        const expectPatterns = opts.components.map(comp => {
            return {
                from: resolve(comp),
                to: comp,
                ignore: [ '**/*.!(js|json|wxss|wxml)' ]
            };
        });
        if (expect(patterns).to.have.deep.members(expectPatterns)) {
            res();
        } else {
            rej();
        }
    });
}

describe('should get error', () => {
    it('component not exist', (done) => {
        const components = [
        ];
        const compilation = {
            errors: [],
            entries: generatorEntries([
                {
                    name: 'pages/self/index.json',
                    context: resolve('pages/self'),
                    content: {
                        usingComponents: {
                            none: '/components/none/index'
                        }
                    }
                }
            ])
        };
        run({
            compilation,
            components
        })
        .then(() => {
            done(compilation.errors.length !== 0 ? null : new Error('not get error'));
        })
        .catch(done);
    });
});

// 目录中使用单独的 json 文件来模拟 mpvue-loader 在 emit 生成的 json 文件
// 低版本 mpvue-loader
describe('generator patterns when emit', () => {
    describe('single pages', () => {
        it('relative path', (done) => {
            const components = [ 'components/button' ];
            run({
                compilation: {
                    entries: generatorEntries([
                        {
                            name: 'pages/self/index.json',
                            context: resolve('pages/self'),
                            content: {
                                usingComponents: {
                                    button: '/components/button/index'
                                }
                            }
                        }
                    ])
                },
                components
            })
            .then(done)
            .catch(done);
        });

        it('absolute path and import component from other component', (done) => {
            const components = [
                'components/button',
                'components/panel'
            ];
            run({
                compilation: {
                    entries: generatorEntries([
                        {
                            name: 'pages/normal/index.json',
                            context: resolve('pages/normal'),
                            content: {
                                usingComponents: {
                                    panel: '/components/panel/index'
                                }
                            }
                        }
                    ])
                },
                components
            })
            .then(done)
            .catch(done);
        });
    });

    describe('multiply pages', () => {
        it('repeat import component', (done) => {
            const components = [
                'components/button',
                'components/panel'
            ];
            run({
                compilation: {
                    entries: generatorEntries([
                        {
                            name: 'pages/self/index.json',
                            context: resolve('pages/self'),
                            content: {
                                usingComponents: {
                                    button: '/components/button/index'
                                }
                            }
                        },
                        {
                            name: 'pages/normal/index.json',
                            context: resolve('pages/normal'),
                            content: {
                                usingComponents: {
                                    panel: '/components/panel/index'
                                }
                            }
                        }
                    ])
                },
                components
            })
            .then(done)
            .catch(done);
        });
    });
});

// 高版本 mpvue-loader
describe('generator patterns read json path', () => {
    const config = {
        src: resolve()
    };

    describe('config src path', () => {
        it('relative path', (done) => {
            const components = [
                'components/button',
                'components/panel'
            ];
            run({
                components,
                config
            })
            .then(done)
            .catch(done);
        });
    });

    describe('copy native page', () => {
        it('relative path', (done) => {
            const components = [
                'components/button',
                'components/panel',
                'pages/native'
            ];
            run({
                components,
                config: {
                    src: resolve(),
                    native: true
                }
            })
            .then(done)
            .catch(done);
        });
    });
});
