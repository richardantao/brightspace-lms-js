export { BrightspaceClient } from "./client";

export type {
	AuthConfig,
	BearerAuthConfig,
	LegacyAuthConfig,
	OAuth2AuthorizationCodeConfig,
	OAuth2ClientCredentialsConfig,
	BrightspaceClientConfig,
	D2LProduct,
	D2LVersion,
	HttpMethod,
	ListOptions,
	Middleware,
	PaginatedList,
	PaginatedRequest,
	RequestContext,
	ResponseContext,
	VersionCheckResult,
	VersionSpec,
} from "./types";

export {
	BrightspaceError,
	AuthError,
	ValidationError,
	NotFoundError,
	RateLimitError,
	ServerError,
	VersionError,
	NetworkError,
	// Type guards
	isBrightspaceError,
	isAuthError,
	isNotFoundError,
	isRateLimitError,
	isVersionError,
} from "./core/errors";

export { UsersResource } from "./resources/users";
export { EnrollmentsResource } from "./resources/enrollments";
export { CoursesResource } from "./resources/courses";
export { GradesResource } from "./resources/grades";
export { VersionsResource } from "./resources/versions";
export { QuizzesResource } from "./resources/quizzes";
export { DropboxesResource } from "./resources/dropboxes";
export { AssessmentsResource } from "./resources/assessments";
export { CalendarResource } from "./resources/calendar";

export type {
	// Users
	WhoAmIUser,
	UserData,
	UserActivationData,
	CreateUserData,
	UpdateUserData,
	LegalPreferredNames,
	UserPasswordData,
	UserResetPassword,
	UserPronouns,
	BatchUserCreateError,
	ListUsersParams,
} from "./resources/users";

export type {
	// Enrollments
	OrgUnitTypeInfo,
	OrgUnitInfo,
	RoleInfo,
	MyOrgUnitInfo,
	EnrollmentData,
	CreateEnrollmentData,
	OrgUnitUser,
	ClasslistUser,
	UserOrgUnit,
	CompletionData,
	CompletionParameterData,
	ListMyEnrollmentsParams,
	ListOrgUnitUsersParams,
	ListUserEnrollmentsParams,
} from "./resources/enrollments";

export type {
	// Courses
	BasicOrgUnit,
	CourseOffering,
	CourseOfferingInfo,
	CreateCourseOffering,
	CourseTemplate,
	CourseTemplateInfo,
	CreateCourseTemplate,
	CourseDatesUpdateInfo,
	CourseDatesUpdateJob,
	CourseUpdateStatus,
	ListCourseOfferingsParams,
	// RichText types are shared across resources — export once from courses
	RichText,
	RichTextInput,
} from "./resources/courses";

export type {
	// Grades
	GradeObject,
	GradeObjectInput,
	GradeObjectCategory,
	GradeObjectCategoryData,
	GradeValue,
	GradeValueInput,
	GradeScheme,
	GradeSchemeRange,
	GradeSchemeData,
	AssociatedTool,
	ListGradeValuesParams,
} from "./resources/grades";

// GradeObjectType is a const object (value + type) — exported as a value, not type
export { GradeObjectType } from "./resources/grades";
