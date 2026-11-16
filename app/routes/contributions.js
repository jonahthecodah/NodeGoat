const ContributionsDAO = require("../data/contributions-dao").ContributionsDAO;
const {
    environmentalScripts
} = require("../../config/config");

const MAX_CONTRIBUTION = 30;

// Accepts only whole-number percentages from 0 to MAX_CONTRIBUTION; returns null otherwise.
const parseContribution = value => {
    "use strict";

    if (typeof value !== "string" || !/^\d{1,3}$/.test(value.trim())) {
        return null;
    }
    const parsed = parseInt(value, 10);
    return parsed <= MAX_CONTRIBUTION ? parsed : null;
};

/* The ContributionsHandler must be constructed with a connected db */
function ContributionsHandler(db) {
    "use strict";

    const contributionsDAO = new ContributionsDAO(db);

    this.displayContributions = (req, res, next) => {
        const {
            userId
        } = req.session;

        contributionsDAO.getByUserId(userId, (error, contrib) => {
            if (error) return next(error);

            contrib.userId = userId; //set for nav menu items
            return res.render("contributions", {
                ...contrib,
                environmentalScripts
            });
        });
    };

    this.handleContributionsUpdate = (req, res, next) => {

        const preTax = parseContribution(req.body.preTax);
        const afterTax = parseContribution(req.body.afterTax);
        const roth = parseContribution(req.body.roth);

        const {
            userId
        } = req.session;

        //validate contributions
        const isInvalid = [preTax, afterTax, roth].some(value => value === null);
        if (isInvalid) {
            return res.render("contributions", {
                updateError: "Invalid contribution percentages",
                userId,
                environmentalScripts
            });
        }
        // Prevent more than 30% contributions
        if (preTax + afterTax + roth > MAX_CONTRIBUTION) {
            return res.render("contributions", {
                updateError: "Contribution percentages cannot exceed 30 %",
                userId,
                environmentalScripts
            });
        }

        contributionsDAO.update(userId, preTax, afterTax, roth, (err, contributions) => {

            if (err) return next(err);

            contributions.updateSuccess = true;
            return res.render("contributions", {
                ...contributions,
                environmentalScripts
            });
        });

    };

}

module.exports = ContributionsHandler;
