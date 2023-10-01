module.exports = async function (context, req) {
    if (req.body.email) {
        var email = {
            from: {
                email: '[EMAL]'
            },
            subject: "Contact form submission from: " + req.body.name,
            content: [{
                type: 'text/html',
                value: `<p><strong>From:</strong>  ${req.body.email}</p><p> <strong>Message:</strong> ${req.body.message}</p>`
            }]
        };

        return {
            res: {
                status: 200
            },
            message: email
        };
    } else {
        return {
            res: {
                status: 400
            }
        };
    }
};