module.exports = [
    {
        path: 'pages/normal',
        config: {
            usingComponents: {
                'button': '/components/button/index'
            }
        }
    },
    {
        path: 'pages/self',
        config: {
            usingComponents: {
                'panel': '../components/panel/index'
            }
        }
    }
];