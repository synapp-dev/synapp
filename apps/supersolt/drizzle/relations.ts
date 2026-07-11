import { relations } from "drizzle-orm/relations";
import { flowStateInAuth, samlRelayStatesInAuth, ssoProvidersInAuth, samlProvidersInAuth, sessionsInAuth, refreshTokensInAuth, oauthClientsInAuth, usersInAuth, ssoDomainsInAuth, mfaAmrClaimsInAuth, identitiesInAuth, oneTimeTokensInAuth, mfaFactorsInAuth, mfaChallengesInAuth, oauthConsentsInAuth, oauthAuthorizationsInAuth, webauthnCredentialsInAuth, webauthnChallengesInAuth, positions, userVenues, roles, userOrganisations, venues, venueForecastState, organisations, venueSquareConnections, recipes, recipeMethodSteps, menuItems, menuItemSquareCatalogLinks, recipeAllergens, menuItemRecipes, menuItemGroups, venueSquareOrderLines, ingredients, ingredientOrderBuffers, suppliers, rosterTemplates, rosterTemplateShifts, userProfiles, dashboardUserPreferences, agentDigestCache, venueStaffWeeklyAvailability, insightsAlerts, venueXeroConnections, organisationPurchasingSettings, inventorySetupImportJobs, venueStaffWeekInstanceAvailability, purchaseOrders, purchaseOrderEmails, purchaseOrderLines, supplierProducts, purchaseOrderReceivingEvents, venueInvoices, purchaseOrderAuditLog, orderGuideCache, venueInvoiceLineItems, invoiceCostChangeEvents, venueModifierLists, venueModifiers, menuItemGroupModifierLists, venueEmailInboxes, venueInvoiceAttachments, venueInvoiceAuditLog, rosterShifts, rosterWeeks, supplierProductPriceHistory, inboundEmailLog, shiftComplianceFlags, rosterPublishDeliveries, shiftBreaks, consumptionExceptions, wasteEntries, leaveTypes, leaveBalances, leaveRequests, leaveAuditLog, leaveAccrualEvents, payrollLeaveLines, payRuns, awards, awardClassifications, awardRates, penaltyRates, juniorRateScales, minimumEngagements, awardAllowances, libraryUpdateLog, organisationAwardConfig, awrUpliftEvents, employeePayRateHistory, timesheets, payPeriods, payrollTimesheetLines, timesheetClockEvents, timesheetDisputes, timesheetAuditLog, organisationPayrollSettings, payRunLineItems, payrollPreflightChecks, payrollAuditLog, payrollXeroPushLog, authWhitelist, organisationMemberInvites, venueSquarePayments, venueStorageLocations, ingredientStorageLocations, stockCountSchedules, stockCountTemplates, stockCounts, ingredientConsumptionDaily, stockCountEntries, stockCountVarianceEvents, stockCountAuditEvents, venueReadinessUserState, employeeCertifications, employeeDocuments, employeeAuditLog, xeroEmployeeSyncLog, employeeOnboardingTokens, supplierRawItems, recipeIngredients, purchaseOrderNumberSequences, forecasts, dailySales, employeePayrollProfiles } from "./schema";

export const samlRelayStatesInAuthRelations = relations(samlRelayStatesInAuth, ({one}) => ({
	flowStateInAuth: one(flowStateInAuth, {
		fields: [samlRelayStatesInAuth.flowStateId],
		references: [flowStateInAuth.id]
	}),
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [samlRelayStatesInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const flowStateInAuthRelations = relations(flowStateInAuth, ({many}) => ({
	samlRelayStatesInAuths: many(samlRelayStatesInAuth),
}));

export const ssoProvidersInAuthRelations = relations(ssoProvidersInAuth, ({many}) => ({
	samlRelayStatesInAuths: many(samlRelayStatesInAuth),
	samlProvidersInAuths: many(samlProvidersInAuth),
	ssoDomainsInAuths: many(ssoDomainsInAuth),
}));

export const samlProvidersInAuthRelations = relations(samlProvidersInAuth, ({one}) => ({
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [samlProvidersInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const refreshTokensInAuthRelations = relations(refreshTokensInAuth, ({one}) => ({
	sessionsInAuth: one(sessionsInAuth, {
		fields: [refreshTokensInAuth.sessionId],
		references: [sessionsInAuth.id]
	}),
}));

export const sessionsInAuthRelations = relations(sessionsInAuth, ({one, many}) => ({
	refreshTokensInAuths: many(refreshTokensInAuth),
	oauthClientsInAuth: one(oauthClientsInAuth, {
		fields: [sessionsInAuth.oauthClientId],
		references: [oauthClientsInAuth.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [sessionsInAuth.userId],
		references: [usersInAuth.id]
	}),
	mfaAmrClaimsInAuths: many(mfaAmrClaimsInAuth),
}));

export const oauthClientsInAuthRelations = relations(oauthClientsInAuth, ({many}) => ({
	sessionsInAuths: many(sessionsInAuth),
	oauthConsentsInAuths: many(oauthConsentsInAuth),
	oauthAuthorizationsInAuths: many(oauthAuthorizationsInAuth),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	sessionsInAuths: many(sessionsInAuth),
	identitiesInAuths: many(identitiesInAuth),
	oneTimeTokensInAuths: many(oneTimeTokensInAuth),
	mfaFactorsInAuths: many(mfaFactorsInAuth),
	oauthConsentsInAuths: many(oauthConsentsInAuth),
	oauthAuthorizationsInAuths: many(oauthAuthorizationsInAuth),
	webauthnCredentialsInAuths: many(webauthnCredentialsInAuth),
	webauthnChallengesInAuths: many(webauthnChallengesInAuth),
	insightsAlerts: many(insightsAlerts),
	userProfiles: many(userProfiles),
}));

export const ssoDomainsInAuthRelations = relations(ssoDomainsInAuth, ({one}) => ({
	ssoProvidersInAuth: one(ssoProvidersInAuth, {
		fields: [ssoDomainsInAuth.ssoProviderId],
		references: [ssoProvidersInAuth.id]
	}),
}));

export const mfaAmrClaimsInAuthRelations = relations(mfaAmrClaimsInAuth, ({one}) => ({
	sessionsInAuth: one(sessionsInAuth, {
		fields: [mfaAmrClaimsInAuth.sessionId],
		references: [sessionsInAuth.id]
	}),
}));

export const identitiesInAuthRelations = relations(identitiesInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [identitiesInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const oneTimeTokensInAuthRelations = relations(oneTimeTokensInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [oneTimeTokensInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const mfaChallengesInAuthRelations = relations(mfaChallengesInAuth, ({one}) => ({
	mfaFactorsInAuth: one(mfaFactorsInAuth, {
		fields: [mfaChallengesInAuth.factorId],
		references: [mfaFactorsInAuth.id]
	}),
}));

export const mfaFactorsInAuthRelations = relations(mfaFactorsInAuth, ({one, many}) => ({
	mfaChallengesInAuths: many(mfaChallengesInAuth),
	usersInAuth: one(usersInAuth, {
		fields: [mfaFactorsInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const oauthConsentsInAuthRelations = relations(oauthConsentsInAuth, ({one}) => ({
	oauthClientsInAuth: one(oauthClientsInAuth, {
		fields: [oauthConsentsInAuth.clientId],
		references: [oauthClientsInAuth.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [oauthConsentsInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const oauthAuthorizationsInAuthRelations = relations(oauthAuthorizationsInAuth, ({one}) => ({
	oauthClientsInAuth: one(oauthClientsInAuth, {
		fields: [oauthAuthorizationsInAuth.clientId],
		references: [oauthClientsInAuth.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [oauthAuthorizationsInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const webauthnCredentialsInAuthRelations = relations(webauthnCredentialsInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [webauthnCredentialsInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const webauthnChallengesInAuthRelations = relations(webauthnChallengesInAuth, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [webauthnChallengesInAuth.userId],
		references: [usersInAuth.id]
	}),
}));

export const userVenuesRelations = relations(userVenues, ({one}) => ({
	position: one(positions, {
		fields: [userVenues.defaultPositionId],
		references: [positions.id]
	}),
	role: one(roles, {
		fields: [userVenues.roleId],
		references: [roles.id]
	}),
	userOrganisation: one(userOrganisations, {
		fields: [userVenues.userOrganisationId],
		references: [userOrganisations.id]
	}),
	venue: one(venues, {
		fields: [userVenues.organisationId],
		references: [venues.id]
	}),
}));

export const positionsRelations = relations(positions, ({one, many}) => ({
	userVenues: many(userVenues),
	organisation: one(organisations, {
		fields: [positions.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [positions.organisationId],
		references: [venues.id]
	}),
	rosterTemplateShifts: many(rosterTemplateShifts),
	rosterShifts: many(rosterShifts),
	timesheets: many(timesheets),
}));

export const rolesRelations = relations(roles, ({one, many}) => ({
	userVenues: many(userVenues),
	organisation: one(organisations, {
		fields: [roles.organisationId],
		references: [organisations.id]
	}),
	organisationMemberInvites: many(organisationMemberInvites),
	userOrganisations: many(userOrganisations),
}));

export const userOrganisationsRelations = relations(userOrganisations, ({one, many}) => ({
	userVenues: many(userVenues),
	organisation: one(organisations, {
		fields: [userOrganisations.organisationId],
		references: [organisations.id]
	}),
	role: one(roles, {
		fields: [userOrganisations.roleId],
		references: [roles.id]
	}),
	userProfile: one(userProfiles, {
		fields: [userOrganisations.userProfileId],
		references: [userProfiles.id]
	}),
	employeeOnboardingTokens: many(employeeOnboardingTokens),
}));

export const venuesRelations = relations(venues, ({one, many}) => ({
	userVenues: many(userVenues),
	venueForecastStates: many(venueForecastState),
	venueSquareConnections: many(venueSquareConnections),
	recipes: many(recipes),
	menuItemSquareCatalogLinks: many(menuItemSquareCatalogLinks),
	menuItems: many(menuItems),
	venueSquareOrderLines: many(venueSquareOrderLines),
	ingredientOrderBuffers: many(ingredientOrderBuffers),
	positions: many(positions),
	suppliers: many(suppliers),
	rosterTemplates: many(rosterTemplates),
	venueStaffWeeklyAvailabilities: many(venueStaffWeeklyAvailability),
	insightsAlerts: many(insightsAlerts),
	venueXeroConnections: many(venueXeroConnections),
	inventorySetupImportJobs: many(inventorySetupImportJobs),
	venueStaffWeekInstanceAvailabilities: many(venueStaffWeekInstanceAvailability),
	purchaseOrders: many(purchaseOrders),
	orderGuideCaches: many(orderGuideCache),
	venueInvoiceLineItems: many(venueInvoiceLineItems),
	venueInvoices: many(venueInvoices),
	menuItemGroups: many(menuItemGroups),
	venueModifierLists: many(venueModifierLists),
	venueModifiers: many(venueModifiers),
	menuItemGroupModifierLists: many(menuItemGroupModifierLists),
	venueEmailInboxes: many(venueEmailInboxes),
	venueInvoiceAttachments: many(venueInvoiceAttachments),
	rosterShifts: many(rosterShifts),
	inboundEmailLogs: many(inboundEmailLog),
	rosterWeeks: many(rosterWeeks),
	consumptionExceptions: many(consumptionExceptions),
	wasteEntries: many(wasteEntries),
	leaveRequests: many(leaveRequests),
	organisation: one(organisations, {
		fields: [venues.organisationId],
		references: [organisations.id]
	}),
	timesheets: many(timesheets),
	organisationPayrollSettings: many(organisationPayrollSettings),
	venueSquarePayments: many(venueSquarePayments),
	venueStorageLocations: many(venueStorageLocations),
	stockCountSchedules: many(stockCountSchedules),
	stockCountTemplates: many(stockCountTemplates),
	stockCounts: many(stockCounts),
	ingredientConsumptionDailies: many(ingredientConsumptionDaily),
	venueReadinessUserStates: many(venueReadinessUserState),
	supplierProducts: many(supplierProducts),
	ingredients: many(ingredients),
	purchaseOrderNumberSequences: many(purchaseOrderNumberSequences),
	forecasts: many(forecasts),
	dailySales: many(dailySales),
}));

export const venueForecastStateRelations = relations(venueForecastState, ({one}) => ({
	venue: one(venues, {
		fields: [venueForecastState.venueId],
		references: [venues.id]
	}),
}));

export const venueSquareConnectionsRelations = relations(venueSquareConnections, ({one}) => ({
	organisation: one(organisations, {
		fields: [venueSquareConnections.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [venueSquareConnections.venueId],
		references: [venues.id]
	}),
}));

export const organisationsRelations = relations(organisations, ({many}) => ({
	venueSquareConnections: many(venueSquareConnections),
	recipes: many(recipes),
	menuItemSquareCatalogLinks: many(menuItemSquareCatalogLinks),
	roles: many(roles),
	menuItems: many(menuItems),
	venueSquareOrderLines: many(venueSquareOrderLines),
	ingredientOrderBuffers: many(ingredientOrderBuffers),
	positions: many(positions),
	suppliers: many(suppliers),
	rosterTemplates: many(rosterTemplates),
	dashboardUserPreferences: many(dashboardUserPreferences),
	agentDigestCaches: many(agentDigestCache),
	venueStaffWeeklyAvailabilities: many(venueStaffWeeklyAvailability),
	insightsAlerts: many(insightsAlerts),
	venueXeroConnections: many(venueXeroConnections),
	organisationPurchasingSettings: many(organisationPurchasingSettings),
	inventorySetupImportJobs: many(inventorySetupImportJobs),
	venueStaffWeekInstanceAvailabilities: many(venueStaffWeekInstanceAvailability),
	purchaseOrders: many(purchaseOrders),
	venueInvoiceLineItems: many(venueInvoiceLineItems),
	venueInvoices: many(venueInvoices),
	menuItemGroups: many(menuItemGroups),
	venueModifierLists: many(venueModifierLists),
	venueModifiers: many(venueModifiers),
	menuItemGroupModifierLists: many(menuItemGroupModifierLists),
	venueEmailInboxes: many(venueEmailInboxes),
	venueInvoiceAttachments: many(venueInvoiceAttachments),
	rosterShifts: many(rosterShifts),
	supplierProductPriceHistories: many(supplierProductPriceHistory),
	inboundEmailLogs: many(inboundEmailLog),
	rosterWeeks: many(rosterWeeks),
	consumptionExceptions: many(consumptionExceptions),
	wasteEntries: many(wasteEntries),
	leaveTypes: many(leaveTypes),
	leaveBalances: many(leaveBalances),
	leaveRequests: many(leaveRequests),
	leaveAuditLogs: many(leaveAuditLog),
	leaveAccrualEvents: many(leaveAccrualEvents),
	payrollLeaveLines: many(payrollLeaveLines),
	venues: many(venues),
	organisationAwardConfigs: many(organisationAwardConfig),
	awrUpliftEvents: many(awrUpliftEvents),
	employeePayRateHistories: many(employeePayRateHistory),
	timesheets: many(timesheets),
	payrollTimesheetLines: many(payrollTimesheetLines),
	payPeriods: many(payPeriods),
	timesheetClockEvents: many(timesheetClockEvents),
	timesheetDisputes: many(timesheetDisputes),
	timesheetAuditLogs: many(timesheetAuditLog),
	organisationPayrollSettings: many(organisationPayrollSettings),
	payRuns: many(payRuns),
	payRunLineItems: many(payRunLineItems),
	payrollPreflightChecks: many(payrollPreflightChecks),
	payrollAuditLogs: many(payrollAuditLog),
	payrollXeroPushLogs: many(payrollXeroPushLog),
	authWhitelists: many(authWhitelist),
	organisationMemberInvites: many(organisationMemberInvites),
	venueSquarePayments: many(venueSquarePayments),
	venueStorageLocations: many(venueStorageLocations),
	stockCountSchedules: many(stockCountSchedules),
	stockCounts: many(stockCounts),
	userOrganisations: many(userOrganisations),
	employeeCertifications: many(employeeCertifications),
	employeeDocuments: many(employeeDocuments),
	employeeAuditLogs: many(employeeAuditLog),
	xeroEmployeeSyncLogs: many(xeroEmployeeSyncLog),
	employeeOnboardingTokens: many(employeeOnboardingTokens),
	supplierProducts: many(supplierProducts),
	supplierRawItems: many(supplierRawItems),
	ingredients: many(ingredients),
	employeePayrollProfiles: many(employeePayrollProfiles),
}));

export const recipesRelations = relations(recipes, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [recipes.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [recipes.venueId],
		references: [venues.id]
	}),
	recipeMethodSteps: many(recipeMethodSteps),
	recipeAllergens: many(recipeAllergens),
	menuItemRecipes: many(menuItemRecipes),
	consumptionExceptions: many(consumptionExceptions),
	wasteEntries: many(wasteEntries),
	recipeIngredients_recipeId: many(recipeIngredients, {
		relationName: "recipeIngredients_recipeId_recipes_id"
	}),
	recipeIngredients_subRecipeId: many(recipeIngredients, {
		relationName: "recipeIngredients_subRecipeId_recipes_id"
	}),
}));

export const recipeMethodStepsRelations = relations(recipeMethodSteps, ({one}) => ({
	recipe: one(recipes, {
		fields: [recipeMethodSteps.recipeId],
		references: [recipes.id]
	}),
}));

export const menuItemSquareCatalogLinksRelations = relations(menuItemSquareCatalogLinks, ({one}) => ({
	menuItem: one(menuItems, {
		fields: [menuItemSquareCatalogLinks.menuItemId],
		references: [menuItems.id]
	}),
	organisation: one(organisations, {
		fields: [menuItemSquareCatalogLinks.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [menuItemSquareCatalogLinks.venueId],
		references: [venues.id]
	}),
}));

export const menuItemsRelations = relations(menuItems, ({one, many}) => ({
	menuItemSquareCatalogLinks: many(menuItemSquareCatalogLinks),
	menuItemRecipes: many(menuItemRecipes),
	menuItemGroup: one(menuItemGroups, {
		fields: [menuItems.groupId],
		references: [menuItemGroups.id]
	}),
	organisation: one(organisations, {
		fields: [menuItems.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [menuItems.venueId],
		references: [venues.id]
	}),
	venueSquareOrderLines: many(venueSquareOrderLines),
	consumptionExceptions: many(consumptionExceptions),
}));

export const recipeAllergensRelations = relations(recipeAllergens, ({one}) => ({
	recipe: one(recipes, {
		fields: [recipeAllergens.recipeId],
		references: [recipes.id]
	}),
}));

export const menuItemRecipesRelations = relations(menuItemRecipes, ({one}) => ({
	menuItem: one(menuItems, {
		fields: [menuItemRecipes.menuItemId],
		references: [menuItems.id]
	}),
	recipe: one(recipes, {
		fields: [menuItemRecipes.recipeId],
		references: [recipes.id]
	}),
}));

export const menuItemGroupsRelations = relations(menuItemGroups, ({one, many}) => ({
	menuItems: many(menuItems),
	organisation: one(organisations, {
		fields: [menuItemGroups.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [menuItemGroups.venueId],
		references: [venues.id]
	}),
	menuItemGroupModifierLists: many(menuItemGroupModifierLists),
}));

export const venueSquareOrderLinesRelations = relations(venueSquareOrderLines, ({one}) => ({
	menuItem: one(menuItems, {
		fields: [venueSquareOrderLines.menuItemId],
		references: [menuItems.id]
	}),
	organisation: one(organisations, {
		fields: [venueSquareOrderLines.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [venueSquareOrderLines.venueId],
		references: [venues.id]
	}),
}));

export const ingredientOrderBuffersRelations = relations(ingredientOrderBuffers, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [ingredientOrderBuffers.ingredientId],
		references: [ingredients.id]
	}),
	organisation: one(organisations, {
		fields: [ingredientOrderBuffers.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [ingredientOrderBuffers.venueId],
		references: [venues.id]
	}),
}));

export const ingredientsRelations = relations(ingredients, ({one, many}) => ({
	ingredientOrderBuffers: many(ingredientOrderBuffers),
	purchaseOrderLines: many(purchaseOrderLines),
	venueInvoiceLineItems: many(venueInvoiceLineItems),
	consumptionExceptions: many(consumptionExceptions),
	wasteEntries: many(wasteEntries),
	ingredientStorageLocations: many(ingredientStorageLocations),
	ingredientConsumptionDailies: many(ingredientConsumptionDaily),
	stockCountEntries: many(stockCountEntries),
	stockCountVarianceEvents: many(stockCountVarianceEvents),
	supplierProducts: many(supplierProducts, {
		relationName: "supplierProducts_ingredientId_ingredients_id"
	}),
	supplierProduct: one(supplierProducts, {
		fields: [ingredients.activeSupplierProductId],
		references: [supplierProducts.id],
		relationName: "ingredients_activeSupplierProductId_supplierProducts_id"
	}),
	organisation: one(organisations, {
		fields: [ingredients.organisationId],
		references: [organisations.id]
	}),
	supplier: one(suppliers, {
		fields: [ingredients.supplierId],
		references: [suppliers.id]
	}),
	venue: one(venues, {
		fields: [ingredients.venueId],
		references: [venues.id]
	}),
	recipeIngredients: many(recipeIngredients),
}));

export const suppliersRelations = relations(suppliers, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [suppliers.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [suppliers.venueId],
		references: [venues.id]
	}),
	purchaseOrders: many(purchaseOrders),
	venueInvoices: many(venueInvoices),
	supplierProducts: many(supplierProducts),
	supplierRawItems: many(supplierRawItems),
	ingredients: many(ingredients),
}));

export const rosterTemplatesRelations = relations(rosterTemplates, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [rosterTemplates.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [rosterTemplates.organisationId],
		references: [venues.id]
	}),
	rosterTemplateShifts: many(rosterTemplateShifts),
	rosterShifts: many(rosterShifts),
}));

export const rosterTemplateShiftsRelations = relations(rosterTemplateShifts, ({one}) => ({
	position: one(positions, {
		fields: [rosterTemplateShifts.positionId],
		references: [positions.id]
	}),
	rosterTemplate: one(rosterTemplates, {
		fields: [rosterTemplateShifts.templateId],
		references: [rosterTemplates.id]
	}),
	userProfile: one(userProfiles, {
		fields: [rosterTemplateShifts.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one, many}) => ({
	rosterTemplateShifts: many(rosterTemplateShifts),
	dashboardUserPreferences: many(dashboardUserPreferences),
	agentDigestCaches: many(agentDigestCache),
	venueStaffWeeklyAvailabilities: many(venueStaffWeeklyAvailability),
	inventorySetupImportJobs: many(inventorySetupImportJobs),
	venueStaffWeekInstanceAvailabilities: many(venueStaffWeekInstanceAvailability),
	rosterShifts_publishedBy: many(rosterShifts, {
		relationName: "rosterShifts_publishedBy_userProfiles_id"
	}),
	rosterShifts_userProfileId: many(rosterShifts, {
		relationName: "rosterShifts_userProfileId_userProfiles_id"
	}),
	rosterWeeks: many(rosterWeeks),
	shiftComplianceFlags: many(shiftComplianceFlags),
	rosterPublishDeliveries: many(rosterPublishDeliveries),
	leaveBalances: many(leaveBalances),
	leaveRequests_decidedByUserId: many(leaveRequests, {
		relationName: "leaveRequests_decidedByUserId_userProfiles_id"
	}),
	leaveRequests_userProfileId: many(leaveRequests, {
		relationName: "leaveRequests_userProfileId_userProfiles_id"
	}),
	leaveAuditLogs_actorUserId: many(leaveAuditLog, {
		relationName: "leaveAuditLog_actorUserId_userProfiles_id"
	}),
	leaveAuditLogs_userProfileId: many(leaveAuditLog, {
		relationName: "leaveAuditLog_userProfileId_userProfiles_id"
	}),
	leaveAccrualEvents: many(leaveAccrualEvents),
	payrollLeaveLines: many(payrollLeaveLines),
	awrUpliftEvents: many(awrUpliftEvents),
	employeePayRateHistories_createdByUserId: many(employeePayRateHistory, {
		relationName: "employeePayRateHistory_createdByUserId_userProfiles_id"
	}),
	employeePayRateHistories_userProfileId: many(employeePayRateHistory, {
		relationName: "employeePayRateHistory_userProfileId_userProfiles_id"
	}),
	timesheets_approvedBy: many(timesheets, {
		relationName: "timesheets_approvedBy_userProfiles_id"
	}),
	timesheets_userProfileId: many(timesheets, {
		relationName: "timesheets_userProfileId_userProfiles_id"
	}),
	payrollTimesheetLines: many(payrollTimesheetLines),
	timesheetClockEvents: many(timesheetClockEvents),
	timesheetDisputes_disputedBy: many(timesheetDisputes, {
		relationName: "timesheetDisputes_disputedBy_userProfiles_id"
	}),
	timesheetDisputes_resolvedBy: many(timesheetDisputes, {
		relationName: "timesheetDisputes_resolvedBy_userProfiles_id"
	}),
	timesheetAuditLogs: many(timesheetAuditLog),
	payRuns_approvedBy: many(payRuns, {
		relationName: "payRuns_approvedBy_userProfiles_id"
	}),
	payRuns_preparedBy: many(payRuns, {
		relationName: "payRuns_preparedBy_userProfiles_id"
	}),
	payRuns_returnedBy: many(payRuns, {
		relationName: "payRuns_returnedBy_userProfiles_id"
	}),
	payRunLineItems: many(payRunLineItems),
	payrollPreflightChecks: many(payrollPreflightChecks),
	payrollAuditLogs: many(payrollAuditLog),
	authWhitelists: many(authWhitelist),
	organisationMemberInvites: many(organisationMemberInvites),
	venueReadinessUserStates: many(venueReadinessUserState),
	usersInAuth: one(usersInAuth, {
		fields: [userProfiles.id],
		references: [usersInAuth.id]
	}),
	userOrganisations: many(userOrganisations),
	employeeCertifications: many(employeeCertifications),
	employeeDocuments_uploadedByUserId: many(employeeDocuments, {
		relationName: "employeeDocuments_uploadedByUserId_userProfiles_id"
	}),
	employeeDocuments_userProfileId: many(employeeDocuments, {
		relationName: "employeeDocuments_userProfileId_userProfiles_id"
	}),
	employeeAuditLogs_actorUserId: many(employeeAuditLog, {
		relationName: "employeeAuditLog_actorUserId_userProfiles_id"
	}),
	employeeAuditLogs_userProfileId: many(employeeAuditLog, {
		relationName: "employeeAuditLog_userProfileId_userProfiles_id"
	}),
	xeroEmployeeSyncLogs: many(xeroEmployeeSyncLog),
	employeeOnboardingTokens: many(employeeOnboardingTokens),
	employeePayrollProfiles_stapledCheckPerformedBy: many(employeePayrollProfiles, {
		relationName: "employeePayrollProfiles_stapledCheckPerformedBy_userProfiles_id"
	}),
	employeePayrollProfiles_userProfileId: many(employeePayrollProfiles, {
		relationName: "employeePayrollProfiles_userProfileId_userProfiles_id"
	}),
}));

export const dashboardUserPreferencesRelations = relations(dashboardUserPreferences, ({one}) => ({
	organisation: one(organisations, {
		fields: [dashboardUserPreferences.organisationId],
		references: [organisations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [dashboardUserPreferences.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const agentDigestCacheRelations = relations(agentDigestCache, ({one}) => ({
	organisation: one(organisations, {
		fields: [agentDigestCache.organisationId],
		references: [organisations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [agentDigestCache.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const venueStaffWeeklyAvailabilityRelations = relations(venueStaffWeeklyAvailability, ({one}) => ({
	organisation: one(organisations, {
		fields: [venueStaffWeeklyAvailability.organisationId],
		references: [organisations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [venueStaffWeeklyAvailability.userProfileId],
		references: [userProfiles.id]
	}),
	venue: one(venues, {
		fields: [venueStaffWeeklyAvailability.organisationId],
		references: [venues.id]
	}),
}));

export const insightsAlertsRelations = relations(insightsAlerts, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [insightsAlerts.dismissedBy],
		references: [usersInAuth.id]
	}),
	organisation: one(organisations, {
		fields: [insightsAlerts.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [insightsAlerts.venueId],
		references: [venues.id]
	}),
}));

export const venueXeroConnectionsRelations = relations(venueXeroConnections, ({one}) => ({
	organisation: one(organisations, {
		fields: [venueXeroConnections.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [venueXeroConnections.venueId],
		references: [venues.id]
	}),
}));

export const organisationPurchasingSettingsRelations = relations(organisationPurchasingSettings, ({one}) => ({
	organisation: one(organisations, {
		fields: [organisationPurchasingSettings.organisationId],
		references: [organisations.id]
	}),
}));

export const inventorySetupImportJobsRelations = relations(inventorySetupImportJobs, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [inventorySetupImportJobs.createdByUserId],
		references: [userProfiles.id]
	}),
	organisation: one(organisations, {
		fields: [inventorySetupImportJobs.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [inventorySetupImportJobs.venueId],
		references: [venues.id]
	}),
}));

export const venueStaffWeekInstanceAvailabilityRelations = relations(venueStaffWeekInstanceAvailability, ({one}) => ({
	organisation: one(organisations, {
		fields: [venueStaffWeekInstanceAvailability.organisationId],
		references: [organisations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [venueStaffWeekInstanceAvailability.userProfileId],
		references: [userProfiles.id]
	}),
	venue: one(venues, {
		fields: [venueStaffWeekInstanceAvailability.organisationId],
		references: [venues.id]
	}),
}));

export const purchaseOrderEmailsRelations = relations(purchaseOrderEmails, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderEmails.poId],
		references: [purchaseOrders.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({one, many}) => ({
	purchaseOrderEmails: many(purchaseOrderEmails),
	purchaseOrderLines: many(purchaseOrderLines),
	purchaseOrderReceivingEvents: many(purchaseOrderReceivingEvents),
	venueInvoice: one(venueInvoices, {
		fields: [purchaseOrders.linkedInvoiceId],
		references: [venueInvoices.id],
		relationName: "purchaseOrders_linkedInvoiceId_venueInvoices_id"
	}),
	organisation: one(organisations, {
		fields: [purchaseOrders.organisationId],
		references: [organisations.id]
	}),
	supplier: one(suppliers, {
		fields: [purchaseOrders.supplierId],
		references: [suppliers.id]
	}),
	venue: one(venues, {
		fields: [purchaseOrders.venueId],
		references: [venues.id]
	}),
	purchaseOrderAuditLogs: many(purchaseOrderAuditLog),
	venueInvoices: many(venueInvoices, {
		relationName: "venueInvoices_purchaseOrderId_purchaseOrders_id"
	}),
}));

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [purchaseOrderLines.ingredientId],
		references: [ingredients.id]
	}),
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderLines.poId],
		references: [purchaseOrders.id]
	}),
	supplierProduct: one(supplierProducts, {
		fields: [purchaseOrderLines.supplierProductId],
		references: [supplierProducts.id]
	}),
}));

export const supplierProductsRelations = relations(supplierProducts, ({one, many}) => ({
	purchaseOrderLines: many(purchaseOrderLines),
	venueInvoiceLineItems: many(venueInvoiceLineItems),
	invoiceCostChangeEvents: many(invoiceCostChangeEvents),
	supplierProductPriceHistories: many(supplierProductPriceHistory),
	ingredient: one(ingredients, {
		fields: [supplierProducts.ingredientId],
		references: [ingredients.id],
		relationName: "supplierProducts_ingredientId_ingredients_id"
	}),
	organisation: one(organisations, {
		fields: [supplierProducts.organisationId],
		references: [organisations.id]
	}),
	supplier: one(suppliers, {
		fields: [supplierProducts.supplierId],
		references: [suppliers.id]
	}),
	venue: one(venues, {
		fields: [supplierProducts.venueId],
		references: [venues.id]
	}),
	supplierRawItems: many(supplierRawItems),
	ingredients: many(ingredients, {
		relationName: "ingredients_activeSupplierProductId_supplierProducts_id"
	}),
}));

export const purchaseOrderReceivingEventsRelations = relations(purchaseOrderReceivingEvents, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderReceivingEvents.poId],
		references: [purchaseOrders.id]
	}),
}));

export const venueInvoicesRelations = relations(venueInvoices, ({one, many}) => ({
	purchaseOrders: many(purchaseOrders, {
		relationName: "purchaseOrders_linkedInvoiceId_venueInvoices_id"
	}),
	venueInvoiceLineItems: many(venueInvoiceLineItems),
	organisation: one(organisations, {
		fields: [venueInvoices.organisationId],
		references: [organisations.id]
	}),
	purchaseOrder: one(purchaseOrders, {
		fields: [venueInvoices.purchaseOrderId],
		references: [purchaseOrders.id],
		relationName: "venueInvoices_purchaseOrderId_purchaseOrders_id"
	}),
	supplier: one(suppliers, {
		fields: [venueInvoices.supplierId],
		references: [suppliers.id]
	}),
	venue: one(venues, {
		fields: [venueInvoices.venueId],
		references: [venues.id]
	}),
	invoiceCostChangeEvents: many(invoiceCostChangeEvents),
	venueInvoiceAttachments: many(venueInvoiceAttachments),
	venueInvoiceAuditLogs: many(venueInvoiceAuditLog),
	inboundEmailLogs: many(inboundEmailLog),
	supplierRawItems: many(supplierRawItems),
}));

export const purchaseOrderAuditLogRelations = relations(purchaseOrderAuditLog, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderAuditLog.poId],
		references: [purchaseOrders.id]
	}),
}));

export const orderGuideCacheRelations = relations(orderGuideCache, ({one}) => ({
	venue: one(venues, {
		fields: [orderGuideCache.venueId],
		references: [venues.id]
	}),
}));

export const venueInvoiceLineItemsRelations = relations(venueInvoiceLineItems, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [venueInvoiceLineItems.ingredientId],
		references: [ingredients.id]
	}),
	venueInvoice: one(venueInvoices, {
		fields: [venueInvoiceLineItems.invoiceId],
		references: [venueInvoices.id]
	}),
	organisation: one(organisations, {
		fields: [venueInvoiceLineItems.organisationId],
		references: [organisations.id]
	}),
	supplierProduct: one(supplierProducts, {
		fields: [venueInvoiceLineItems.supplierProductId],
		references: [supplierProducts.id]
	}),
	venue: one(venues, {
		fields: [venueInvoiceLineItems.venueId],
		references: [venues.id]
	}),
}));

export const invoiceCostChangeEventsRelations = relations(invoiceCostChangeEvents, ({one}) => ({
	venueInvoice: one(venueInvoices, {
		fields: [invoiceCostChangeEvents.invoiceId],
		references: [venueInvoices.id]
	}),
	supplierProduct: one(supplierProducts, {
		fields: [invoiceCostChangeEvents.supplierProductId],
		references: [supplierProducts.id]
	}),
}));

export const venueModifierListsRelations = relations(venueModifierLists, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [venueModifierLists.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [venueModifierLists.venueId],
		references: [venues.id]
	}),
	venueModifiers: many(venueModifiers),
	menuItemGroupModifierLists: many(menuItemGroupModifierLists),
}));

export const venueModifiersRelations = relations(venueModifiers, ({one}) => ({
	venueModifierList: one(venueModifierLists, {
		fields: [venueModifiers.modifierListId],
		references: [venueModifierLists.id]
	}),
	organisation: one(organisations, {
		fields: [venueModifiers.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [venueModifiers.venueId],
		references: [venues.id]
	}),
}));

export const menuItemGroupModifierListsRelations = relations(menuItemGroupModifierLists, ({one}) => ({
	menuItemGroup: one(menuItemGroups, {
		fields: [menuItemGroupModifierLists.groupId],
		references: [menuItemGroups.id]
	}),
	venueModifierList: one(venueModifierLists, {
		fields: [menuItemGroupModifierLists.modifierListId],
		references: [venueModifierLists.id]
	}),
	organisation: one(organisations, {
		fields: [menuItemGroupModifierLists.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [menuItemGroupModifierLists.venueId],
		references: [venues.id]
	}),
}));

export const venueEmailInboxesRelations = relations(venueEmailInboxes, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [venueEmailInboxes.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [venueEmailInboxes.venueId],
		references: [venues.id]
	}),
	inboundEmailLogs: many(inboundEmailLog),
}));

export const venueInvoiceAttachmentsRelations = relations(venueInvoiceAttachments, ({one}) => ({
	venueInvoice: one(venueInvoices, {
		fields: [venueInvoiceAttachments.invoiceId],
		references: [venueInvoices.id]
	}),
	organisation: one(organisations, {
		fields: [venueInvoiceAttachments.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [venueInvoiceAttachments.venueId],
		references: [venues.id]
	}),
}));

export const venueInvoiceAuditLogRelations = relations(venueInvoiceAuditLog, ({one}) => ({
	venueInvoice: one(venueInvoices, {
		fields: [venueInvoiceAuditLog.invoiceId],
		references: [venueInvoices.id]
	}),
}));

export const rosterShiftsRelations = relations(rosterShifts, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [rosterShifts.organisationId],
		references: [organisations.id]
	}),
	position: one(positions, {
		fields: [rosterShifts.positionId],
		references: [positions.id]
	}),
	userProfile_publishedBy: one(userProfiles, {
		fields: [rosterShifts.publishedBy],
		references: [userProfiles.id],
		relationName: "rosterShifts_publishedBy_userProfiles_id"
	}),
	rosterWeek: one(rosterWeeks, {
		fields: [rosterShifts.rosterWeekId],
		references: [rosterWeeks.id]
	}),
	rosterTemplate: one(rosterTemplates, {
		fields: [rosterShifts.templateId],
		references: [rosterTemplates.id]
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [rosterShifts.userProfileId],
		references: [userProfiles.id],
		relationName: "rosterShifts_userProfileId_userProfiles_id"
	}),
	venue: one(venues, {
		fields: [rosterShifts.organisationId],
		references: [venues.id]
	}),
	shiftComplianceFlags: many(shiftComplianceFlags),
	shiftBreaks: many(shiftBreaks),
	timesheets: many(timesheets),
}));

export const rosterWeeksRelations = relations(rosterWeeks, ({one, many}) => ({
	rosterShifts: many(rosterShifts),
	organisation: one(organisations, {
		fields: [rosterWeeks.organisationId],
		references: [organisations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [rosterWeeks.publishedBy],
		references: [userProfiles.id]
	}),
	venue: one(venues, {
		fields: [rosterWeeks.organisationId],
		references: [venues.id]
	}),
	rosterPublishDeliveries: many(rosterPublishDeliveries),
}));

export const supplierProductPriceHistoryRelations = relations(supplierProductPriceHistory, ({one}) => ({
	organisation: one(organisations, {
		fields: [supplierProductPriceHistory.organisationId],
		references: [organisations.id]
	}),
	supplierProduct: one(supplierProducts, {
		fields: [supplierProductPriceHistory.supplierProductId],
		references: [supplierProducts.id]
	}),
}));

export const inboundEmailLogRelations = relations(inboundEmailLog, ({one}) => ({
	venueEmailInbox: one(venueEmailInboxes, {
		fields: [inboundEmailLog.inboxId],
		references: [venueEmailInboxes.id]
	}),
	venueInvoice: one(venueInvoices, {
		fields: [inboundEmailLog.linkedInvoiceId],
		references: [venueInvoices.id]
	}),
	organisation: one(organisations, {
		fields: [inboundEmailLog.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [inboundEmailLog.venueId],
		references: [venues.id]
	}),
}));

export const shiftComplianceFlagsRelations = relations(shiftComplianceFlags, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [shiftComplianceFlags.overrideBy],
		references: [userProfiles.id]
	}),
	rosterShift: one(rosterShifts, {
		fields: [shiftComplianceFlags.shiftId],
		references: [rosterShifts.id]
	}),
}));

export const rosterPublishDeliveriesRelations = relations(rosterPublishDeliveries, ({one}) => ({
	rosterWeek: one(rosterWeeks, {
		fields: [rosterPublishDeliveries.rosterWeekId],
		references: [rosterWeeks.id]
	}),
	userProfile: one(userProfiles, {
		fields: [rosterPublishDeliveries.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const shiftBreaksRelations = relations(shiftBreaks, ({one}) => ({
	rosterShift: one(rosterShifts, {
		fields: [shiftBreaks.shiftId],
		references: [rosterShifts.id]
	}),
}));

export const consumptionExceptionsRelations = relations(consumptionExceptions, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [consumptionExceptions.ingredientId],
		references: [ingredients.id]
	}),
	menuItem: one(menuItems, {
		fields: [consumptionExceptions.menuItemId],
		references: [menuItems.id]
	}),
	organisation: one(organisations, {
		fields: [consumptionExceptions.organisationId],
		references: [organisations.id]
	}),
	recipe: one(recipes, {
		fields: [consumptionExceptions.recipeId],
		references: [recipes.id]
	}),
	venue: one(venues, {
		fields: [consumptionExceptions.venueId],
		references: [venues.id]
	}),
}));

export const wasteEntriesRelations = relations(wasteEntries, ({one, many}) => ({
	ingredient: one(ingredients, {
		fields: [wasteEntries.ingredientId],
		references: [ingredients.id]
	}),
	organisation: one(organisations, {
		fields: [wasteEntries.organisationId],
		references: [organisations.id]
	}),
	wasteEntry: one(wasteEntries, {
		fields: [wasteEntries.parentEntryId],
		references: [wasteEntries.id],
		relationName: "wasteEntries_parentEntryId_wasteEntries_id"
	}),
	wasteEntries: many(wasteEntries, {
		relationName: "wasteEntries_parentEntryId_wasteEntries_id"
	}),
	recipe: one(recipes, {
		fields: [wasteEntries.recipeId],
		references: [recipes.id]
	}),
	venue: one(venues, {
		fields: [wasteEntries.venueId],
		references: [venues.id]
	}),
}));

export const leaveTypesRelations = relations(leaveTypes, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [leaveTypes.organisationId],
		references: [organisations.id]
	}),
	leaveBalances: many(leaveBalances),
	leaveRequests: many(leaveRequests),
	leaveAccrualEvents: many(leaveAccrualEvents),
	payrollLeaveLines: many(payrollLeaveLines),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({one}) => ({
	leaveType: one(leaveTypes, {
		fields: [leaveBalances.leaveTypeId],
		references: [leaveTypes.id]
	}),
	organisation: one(organisations, {
		fields: [leaveBalances.organisationId],
		references: [organisations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [leaveBalances.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({one, many}) => ({
	userProfile_decidedByUserId: one(userProfiles, {
		fields: [leaveRequests.decidedByUserId],
		references: [userProfiles.id],
		relationName: "leaveRequests_decidedByUserId_userProfiles_id"
	}),
	leaveType: one(leaveTypes, {
		fields: [leaveRequests.leaveTypeId],
		references: [leaveTypes.id]
	}),
	organisation: one(organisations, {
		fields: [leaveRequests.organisationId],
		references: [organisations.id]
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [leaveRequests.userProfileId],
		references: [userProfiles.id],
		relationName: "leaveRequests_userProfileId_userProfiles_id"
	}),
	venue: one(venues, {
		fields: [leaveRequests.organisationId],
		references: [venues.id]
	}),
	leaveAuditLogs: many(leaveAuditLog),
	payrollLeaveLines: many(payrollLeaveLines),
}));

export const leaveAuditLogRelations = relations(leaveAuditLog, ({one}) => ({
	userProfile_actorUserId: one(userProfiles, {
		fields: [leaveAuditLog.actorUserId],
		references: [userProfiles.id],
		relationName: "leaveAuditLog_actorUserId_userProfiles_id"
	}),
	leaveRequest: one(leaveRequests, {
		fields: [leaveAuditLog.leaveRequestId],
		references: [leaveRequests.id]
	}),
	organisation: one(organisations, {
		fields: [leaveAuditLog.organisationId],
		references: [organisations.id]
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [leaveAuditLog.userProfileId],
		references: [userProfiles.id],
		relationName: "leaveAuditLog_userProfileId_userProfiles_id"
	}),
}));

export const leaveAccrualEventsRelations = relations(leaveAccrualEvents, ({one}) => ({
	leaveType: one(leaveTypes, {
		fields: [leaveAccrualEvents.leaveTypeId],
		references: [leaveTypes.id]
	}),
	organisation: one(organisations, {
		fields: [leaveAccrualEvents.organisationId],
		references: [organisations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [leaveAccrualEvents.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const payrollLeaveLinesRelations = relations(payrollLeaveLines, ({one}) => ({
	leaveRequest: one(leaveRequests, {
		fields: [payrollLeaveLines.leaveRequestId],
		references: [leaveRequests.id]
	}),
	leaveType: one(leaveTypes, {
		fields: [payrollLeaveLines.leaveTypeId],
		references: [leaveTypes.id]
	}),
	organisation: one(organisations, {
		fields: [payrollLeaveLines.organisationId],
		references: [organisations.id]
	}),
	payRun: one(payRuns, {
		fields: [payrollLeaveLines.payRunId],
		references: [payRuns.id]
	}),
	userProfile: one(userProfiles, {
		fields: [payrollLeaveLines.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const payRunsRelations = relations(payRuns, ({one, many}) => ({
	payrollLeaveLines: many(payrollLeaveLines),
	timesheets: many(timesheets),
	payrollTimesheetLines: many(payrollTimesheetLines),
	payPeriods: many(payPeriods, {
		relationName: "payPeriods_payrollExportId_payRuns_id"
	}),
	userProfile_approvedBy: one(userProfiles, {
		fields: [payRuns.approvedBy],
		references: [userProfiles.id],
		relationName: "payRuns_approvedBy_userProfiles_id"
	}),
	payRun: one(payRuns, {
		fields: [payRuns.correctsPayRunId],
		references: [payRuns.id],
		relationName: "payRuns_correctsPayRunId_payRuns_id"
	}),
	payRuns: many(payRuns, {
		relationName: "payRuns_correctsPayRunId_payRuns_id"
	}),
	organisation: one(organisations, {
		fields: [payRuns.organisationId],
		references: [organisations.id]
	}),
	payPeriod: one(payPeriods, {
		fields: [payRuns.payPeriodId],
		references: [payPeriods.id],
		relationName: "payRuns_payPeriodId_payPeriods_id"
	}),
	userProfile_preparedBy: one(userProfiles, {
		fields: [payRuns.preparedBy],
		references: [userProfiles.id],
		relationName: "payRuns_preparedBy_userProfiles_id"
	}),
	userProfile_returnedBy: one(userProfiles, {
		fields: [payRuns.returnedBy],
		references: [userProfiles.id],
		relationName: "payRuns_returnedBy_userProfiles_id"
	}),
	payRunLineItems: many(payRunLineItems),
	payrollPreflightChecks: many(payrollPreflightChecks),
	payrollAuditLogs: many(payrollAuditLog),
	payrollXeroPushLogs: many(payrollXeroPushLog),
}));

export const awardClassificationsRelations = relations(awardClassifications, ({one}) => ({
	award: one(awards, {
		fields: [awardClassifications.awardCode],
		references: [awards.awardCode]
	}),
}));

export const awardsRelations = relations(awards, ({many}) => ({
	awardClassifications: many(awardClassifications),
	awardRates: many(awardRates),
	penaltyRates: many(penaltyRates),
	juniorRateScales: many(juniorRateScales),
	minimumEngagements: many(minimumEngagements),
	awardAllowances: many(awardAllowances),
	libraryUpdateLogs: many(libraryUpdateLog),
	organisationAwardConfigs: many(organisationAwardConfig),
	awrUpliftEvents: many(awrUpliftEvents),
}));

export const awardRatesRelations = relations(awardRates, ({one}) => ({
	award: one(awards, {
		fields: [awardRates.awardCode],
		references: [awards.awardCode]
	}),
}));

export const penaltyRatesRelations = relations(penaltyRates, ({one}) => ({
	award: one(awards, {
		fields: [penaltyRates.awardCode],
		references: [awards.awardCode]
	}),
}));

export const juniorRateScalesRelations = relations(juniorRateScales, ({one}) => ({
	award: one(awards, {
		fields: [juniorRateScales.awardCode],
		references: [awards.awardCode]
	}),
}));

export const minimumEngagementsRelations = relations(minimumEngagements, ({one}) => ({
	award: one(awards, {
		fields: [minimumEngagements.awardCode],
		references: [awards.awardCode]
	}),
}));

export const awardAllowancesRelations = relations(awardAllowances, ({one}) => ({
	award: one(awards, {
		fields: [awardAllowances.awardCode],
		references: [awards.awardCode]
	}),
}));

export const libraryUpdateLogRelations = relations(libraryUpdateLog, ({one}) => ({
	award: one(awards, {
		fields: [libraryUpdateLog.awardCode],
		references: [awards.awardCode]
	}),
}));

export const organisationAwardConfigRelations = relations(organisationAwardConfig, ({one}) => ({
	award: one(awards, {
		fields: [organisationAwardConfig.defaultAwardCode],
		references: [awards.awardCode]
	}),
	organisation: one(organisations, {
		fields: [organisationAwardConfig.organisationId],
		references: [organisations.id]
	}),
}));

export const awrUpliftEventsRelations = relations(awrUpliftEvents, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [awrUpliftEvents.appliedByUserId],
		references: [userProfiles.id]
	}),
	award: one(awards, {
		fields: [awrUpliftEvents.awardCode],
		references: [awards.awardCode]
	}),
	organisation: one(organisations, {
		fields: [awrUpliftEvents.organisationId],
		references: [organisations.id]
	}),
}));

export const employeePayRateHistoryRelations = relations(employeePayRateHistory, ({one}) => ({
	userProfile_createdByUserId: one(userProfiles, {
		fields: [employeePayRateHistory.createdByUserId],
		references: [userProfiles.id],
		relationName: "employeePayRateHistory_createdByUserId_userProfiles_id"
	}),
	organisation: one(organisations, {
		fields: [employeePayRateHistory.organisationId],
		references: [organisations.id]
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [employeePayRateHistory.userProfileId],
		references: [userProfiles.id],
		relationName: "employeePayRateHistory_userProfileId_userProfiles_id"
	}),
}));

export const timesheetsRelations = relations(timesheets, ({one, many}) => ({
	userProfile_approvedBy: one(userProfiles, {
		fields: [timesheets.approvedBy],
		references: [userProfiles.id],
		relationName: "timesheets_approvedBy_userProfiles_id"
	}),
	payRun: one(payRuns, {
		fields: [timesheets.lockedInPayrollExportId],
		references: [payRuns.id]
	}),
	organisation: one(organisations, {
		fields: [timesheets.organisationId],
		references: [organisations.id]
	}),
	payPeriod: one(payPeriods, {
		fields: [timesheets.payPeriodId],
		references: [payPeriods.id]
	}),
	position: one(positions, {
		fields: [timesheets.positionId],
		references: [positions.id]
	}),
	rosterShift: one(rosterShifts, {
		fields: [timesheets.shiftId],
		references: [rosterShifts.id]
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [timesheets.userProfileId],
		references: [userProfiles.id],
		relationName: "timesheets_userProfileId_userProfiles_id"
	}),
	venue: one(venues, {
		fields: [timesheets.organisationId],
		references: [venues.id]
	}),
	payrollTimesheetLines: many(payrollTimesheetLines),
	timesheetClockEvents: many(timesheetClockEvents),
	timesheetDisputes: many(timesheetDisputes),
	timesheetAuditLogs: many(timesheetAuditLog),
}));

export const payPeriodsRelations = relations(payPeriods, ({one, many}) => ({
	timesheets: many(timesheets),
	payrollTimesheetLines: many(payrollTimesheetLines),
	organisation: one(organisations, {
		fields: [payPeriods.organisationId],
		references: [organisations.id]
	}),
	payRun: one(payRuns, {
		fields: [payPeriods.payrollExportId],
		references: [payRuns.id],
		relationName: "payPeriods_payrollExportId_payRuns_id"
	}),
	payRuns: many(payRuns, {
		relationName: "payRuns_payPeriodId_payPeriods_id"
	}),
}));

export const payrollTimesheetLinesRelations = relations(payrollTimesheetLines, ({one}) => ({
	organisation: one(organisations, {
		fields: [payrollTimesheetLines.organisationId],
		references: [organisations.id]
	}),
	payPeriod: one(payPeriods, {
		fields: [payrollTimesheetLines.payPeriodId],
		references: [payPeriods.id]
	}),
	payRun: one(payRuns, {
		fields: [payrollTimesheetLines.payRunId],
		references: [payRuns.id]
	}),
	timesheet: one(timesheets, {
		fields: [payrollTimesheetLines.timesheetId],
		references: [timesheets.id]
	}),
	userProfile: one(userProfiles, {
		fields: [payrollTimesheetLines.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const timesheetClockEventsRelations = relations(timesheetClockEvents, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [timesheetClockEvents.createdBy],
		references: [userProfiles.id]
	}),
	organisation: one(organisations, {
		fields: [timesheetClockEvents.organisationId],
		references: [organisations.id]
	}),
	timesheet: one(timesheets, {
		fields: [timesheetClockEvents.timesheetId],
		references: [timesheets.id]
	}),
}));

export const timesheetDisputesRelations = relations(timesheetDisputes, ({one}) => ({
	userProfile_disputedBy: one(userProfiles, {
		fields: [timesheetDisputes.disputedBy],
		references: [userProfiles.id],
		relationName: "timesheetDisputes_disputedBy_userProfiles_id"
	}),
	organisation: one(organisations, {
		fields: [timesheetDisputes.organisationId],
		references: [organisations.id]
	}),
	userProfile_resolvedBy: one(userProfiles, {
		fields: [timesheetDisputes.resolvedBy],
		references: [userProfiles.id],
		relationName: "timesheetDisputes_resolvedBy_userProfiles_id"
	}),
	timesheet: one(timesheets, {
		fields: [timesheetDisputes.timesheetId],
		references: [timesheets.id]
	}),
}));

export const timesheetAuditLogRelations = relations(timesheetAuditLog, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [timesheetAuditLog.actorUserId],
		references: [userProfiles.id]
	}),
	organisation: one(organisations, {
		fields: [timesheetAuditLog.organisationId],
		references: [organisations.id]
	}),
	timesheet: one(timesheets, {
		fields: [timesheetAuditLog.timesheetId],
		references: [timesheets.id]
	}),
}));

export const organisationPayrollSettingsRelations = relations(organisationPayrollSettings, ({one}) => ({
	organisation: one(organisations, {
		fields: [organisationPayrollSettings.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [organisationPayrollSettings.primaryXeroVenueId],
		references: [venues.id]
	}),
}));

export const payRunLineItemsRelations = relations(payRunLineItems, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [payRunLineItems.organisationId],
		references: [organisations.id]
	}),
	payRun: one(payRuns, {
		fields: [payRunLineItems.payRunId],
		references: [payRuns.id]
	}),
	userProfile: one(userProfiles, {
		fields: [payRunLineItems.userProfileId],
		references: [userProfiles.id]
	}),
	payrollAuditLogs: many(payrollAuditLog),
}));

export const payrollPreflightChecksRelations = relations(payrollPreflightChecks, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [payrollPreflightChecks.checkedBy],
		references: [userProfiles.id]
	}),
	organisation: one(organisations, {
		fields: [payrollPreflightChecks.organisationId],
		references: [organisations.id]
	}),
	payRun: one(payRuns, {
		fields: [payrollPreflightChecks.payRunId],
		references: [payRuns.id]
	}),
}));

export const payrollAuditLogRelations = relations(payrollAuditLog, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [payrollAuditLog.actorUserId],
		references: [userProfiles.id]
	}),
	payRunLineItem: one(payRunLineItems, {
		fields: [payrollAuditLog.lineItemId],
		references: [payRunLineItems.id]
	}),
	organisation: one(organisations, {
		fields: [payrollAuditLog.organisationId],
		references: [organisations.id]
	}),
	payRun: one(payRuns, {
		fields: [payrollAuditLog.payRunId],
		references: [payRuns.id]
	}),
}));

export const payrollXeroPushLogRelations = relations(payrollXeroPushLog, ({one}) => ({
	organisation: one(organisations, {
		fields: [payrollXeroPushLog.organisationId],
		references: [organisations.id]
	}),
	payRun: one(payRuns, {
		fields: [payrollXeroPushLog.payRunId],
		references: [payRuns.id]
	}),
}));

export const authWhitelistRelations = relations(authWhitelist, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [authWhitelist.addedBy],
		references: [userProfiles.id]
	}),
	organisation: one(organisations, {
		fields: [authWhitelist.organisationId],
		references: [organisations.id]
	}),
}));

export const organisationMemberInvitesRelations = relations(organisationMemberInvites, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [organisationMemberInvites.invitingUserId],
		references: [userProfiles.id]
	}),
	organisation: one(organisations, {
		fields: [organisationMemberInvites.organisationId],
		references: [organisations.id]
	}),
	role: one(roles, {
		fields: [organisationMemberInvites.roleId],
		references: [roles.id]
	}),
}));

export const venueSquarePaymentsRelations = relations(venueSquarePayments, ({one}) => ({
	organisation: one(organisations, {
		fields: [venueSquarePayments.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [venueSquarePayments.venueId],
		references: [venues.id]
	}),
}));

export const venueStorageLocationsRelations = relations(venueStorageLocations, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [venueStorageLocations.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [venueStorageLocations.venueId],
		references: [venues.id]
	}),
	ingredientStorageLocations: many(ingredientStorageLocations),
	stockCountEntries: many(stockCountEntries),
}));

export const ingredientStorageLocationsRelations = relations(ingredientStorageLocations, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [ingredientStorageLocations.ingredientId],
		references: [ingredients.id]
	}),
	venueStorageLocation: one(venueStorageLocations, {
		fields: [ingredientStorageLocations.locationId],
		references: [venueStorageLocations.id]
	}),
}));

export const stockCountSchedulesRelations = relations(stockCountSchedules, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [stockCountSchedules.organisationId],
		references: [organisations.id]
	}),
	venue: one(venues, {
		fields: [stockCountSchedules.venueId],
		references: [venues.id]
	}),
	stockCounts: many(stockCounts),
}));

export const stockCountTemplatesRelations = relations(stockCountTemplates, ({one, many}) => ({
	venue: one(venues, {
		fields: [stockCountTemplates.venueId],
		references: [venues.id]
	}),
	stockCounts: many(stockCounts),
}));

export const stockCountsRelations = relations(stockCounts, ({one, many}) => ({
	organisation: one(organisations, {
		fields: [stockCounts.organisationId],
		references: [organisations.id]
	}),
	stockCountSchedule: one(stockCountSchedules, {
		fields: [stockCounts.scheduleId],
		references: [stockCountSchedules.id]
	}),
	stockCountTemplate: one(stockCountTemplates, {
		fields: [stockCounts.templateId],
		references: [stockCountTemplates.id]
	}),
	venue: one(venues, {
		fields: [stockCounts.venueId],
		references: [venues.id]
	}),
	stockCountEntries: many(stockCountEntries),
	stockCountVarianceEvents: many(stockCountVarianceEvents),
	stockCountAuditEvents: many(stockCountAuditEvents),
}));

export const ingredientConsumptionDailyRelations = relations(ingredientConsumptionDaily, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [ingredientConsumptionDaily.ingredientId],
		references: [ingredients.id]
	}),
	venue: one(venues, {
		fields: [ingredientConsumptionDaily.venueId],
		references: [venues.id]
	}),
}));

export const stockCountEntriesRelations = relations(stockCountEntries, ({one}) => ({
	stockCount: one(stockCounts, {
		fields: [stockCountEntries.countId],
		references: [stockCounts.id]
	}),
	ingredient: one(ingredients, {
		fields: [stockCountEntries.ingredientId],
		references: [ingredients.id]
	}),
	venueStorageLocation: one(venueStorageLocations, {
		fields: [stockCountEntries.locationId],
		references: [venueStorageLocations.id]
	}),
}));

export const stockCountVarianceEventsRelations = relations(stockCountVarianceEvents, ({one}) => ({
	stockCount: one(stockCounts, {
		fields: [stockCountVarianceEvents.countId],
		references: [stockCounts.id]
	}),
	ingredient: one(ingredients, {
		fields: [stockCountVarianceEvents.ingredientId],
		references: [ingredients.id]
	}),
}));

export const stockCountAuditEventsRelations = relations(stockCountAuditEvents, ({one}) => ({
	stockCount: one(stockCounts, {
		fields: [stockCountAuditEvents.countId],
		references: [stockCounts.id]
	}),
}));

export const venueReadinessUserStateRelations = relations(venueReadinessUserState, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [venueReadinessUserState.userProfileId],
		references: [userProfiles.id]
	}),
	venue: one(venues, {
		fields: [venueReadinessUserState.venueId],
		references: [venues.id]
	}),
}));

export const employeeCertificationsRelations = relations(employeeCertifications, ({one}) => ({
	organisation: one(organisations, {
		fields: [employeeCertifications.organisationId],
		references: [organisations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [employeeCertifications.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const employeeDocumentsRelations = relations(employeeDocuments, ({one}) => ({
	organisation: one(organisations, {
		fields: [employeeDocuments.organisationId],
		references: [organisations.id]
	}),
	userProfile_uploadedByUserId: one(userProfiles, {
		fields: [employeeDocuments.uploadedByUserId],
		references: [userProfiles.id],
		relationName: "employeeDocuments_uploadedByUserId_userProfiles_id"
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [employeeDocuments.userProfileId],
		references: [userProfiles.id],
		relationName: "employeeDocuments_userProfileId_userProfiles_id"
	}),
}));

export const employeeAuditLogRelations = relations(employeeAuditLog, ({one}) => ({
	userProfile_actorUserId: one(userProfiles, {
		fields: [employeeAuditLog.actorUserId],
		references: [userProfiles.id],
		relationName: "employeeAuditLog_actorUserId_userProfiles_id"
	}),
	organisation: one(organisations, {
		fields: [employeeAuditLog.organisationId],
		references: [organisations.id]
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [employeeAuditLog.userProfileId],
		references: [userProfiles.id],
		relationName: "employeeAuditLog_userProfileId_userProfiles_id"
	}),
}));

export const xeroEmployeeSyncLogRelations = relations(xeroEmployeeSyncLog, ({one}) => ({
	organisation: one(organisations, {
		fields: [xeroEmployeeSyncLog.organisationId],
		references: [organisations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [xeroEmployeeSyncLog.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const employeeOnboardingTokensRelations = relations(employeeOnboardingTokens, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [employeeOnboardingTokens.createdByUserId],
		references: [userProfiles.id]
	}),
	organisation: one(organisations, {
		fields: [employeeOnboardingTokens.organisationId],
		references: [organisations.id]
	}),
	userOrganisation: one(userOrganisations, {
		fields: [employeeOnboardingTokens.userOrganisationId],
		references: [userOrganisations.id]
	}),
}));

export const supplierRawItemsRelations = relations(supplierRawItems, ({one}) => ({
	venueInvoice: one(venueInvoices, {
		fields: [supplierRawItems.lastInvoiceId],
		references: [venueInvoices.id]
	}),
	organisation: one(organisations, {
		fields: [supplierRawItems.organisationId],
		references: [organisations.id]
	}),
	supplier: one(suppliers, {
		fields: [supplierRawItems.supplierId],
		references: [suppliers.id]
	}),
	supplierProduct: one(supplierProducts, {
		fields: [supplierRawItems.supplierProductId],
		references: [supplierProducts.id]
	}),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [recipeIngredients.ingredientId],
		references: [ingredients.id]
	}),
	recipe_recipeId: one(recipes, {
		fields: [recipeIngredients.recipeId],
		references: [recipes.id],
		relationName: "recipeIngredients_recipeId_recipes_id"
	}),
	recipe_subRecipeId: one(recipes, {
		fields: [recipeIngredients.subRecipeId],
		references: [recipes.id],
		relationName: "recipeIngredients_subRecipeId_recipes_id"
	}),
}));

export const purchaseOrderNumberSequencesRelations = relations(purchaseOrderNumberSequences, ({one}) => ({
	venue: one(venues, {
		fields: [purchaseOrderNumberSequences.venueId],
		references: [venues.id]
	}),
}));

export const forecastsRelations = relations(forecasts, ({one}) => ({
	venue: one(venues, {
		fields: [forecasts.venueId],
		references: [venues.id]
	}),
}));

export const dailySalesRelations = relations(dailySales, ({one}) => ({
	venue: one(venues, {
		fields: [dailySales.venueId],
		references: [venues.id]
	}),
}));

export const employeePayrollProfilesRelations = relations(employeePayrollProfiles, ({one}) => ({
	organisation: one(organisations, {
		fields: [employeePayrollProfiles.organisationId],
		references: [organisations.id]
	}),
	userProfile_stapledCheckPerformedBy: one(userProfiles, {
		fields: [employeePayrollProfiles.stapledCheckPerformedBy],
		references: [userProfiles.id],
		relationName: "employeePayrollProfiles_stapledCheckPerformedBy_userProfiles_id"
	}),
	userProfile_userProfileId: one(userProfiles, {
		fields: [employeePayrollProfiles.userProfileId],
		references: [userProfiles.id],
		relationName: "employeePayrollProfiles_userProfileId_userProfiles_id"
	}),
}));