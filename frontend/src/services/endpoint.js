const endpoint = {
  company: {
    // Authentication
    signup: "/company/signup",
    login: "/company/login",
    logout: "/company/logout",
    getMe: "/company/me",
    logoutAll: "/company/logout-all",

    // Cookies / Tokens
    refreshToken: "/company/refresh-token",

    // OTP & Password Reset
    verifyOtp: "/company/verify-otp",
    resendOtp: "/company/resend-otp",
    forgotPassword: "/company/forgot-password",
    resetPassword: "/company/reset-password",

    // Company Profile
    getProfile: "/company/profile",
    updateProfile: "/company/profile",
    updateLogo: "/company/profile/logo",
    getPublicProfile: (id) => `/company/public/${id}`,

    // Recruiter & Team Management (company-admin facing)
    getRecruiterProfile: "/recruiter/profile",
    getCompanyRecruiterProfile: (id) => `/recruiter/company/recruiters/${id}`,
    updateRecruiterProfile: "/recruiter/profile/update",
    updateProfilePicture: "/recruiter/profile/picture",
    getCompanyInvite: "/recruiter/company/invite",
    regenerateCompanyInvite: "/recruiter/company/invite/regenerate",
    sendInviteToRecruiter: "/recruiter/company/invite/send",
    getCompanyRecruiters: "/recruiter/company/recruiters",
    updateRecruiterStatus: (id) => `/recruiter/company/recruiters/${id}/status`,
    removeRecruiter: (id) => `/recruiter/company/recruiters/${id}`,

    // Job Management  (Gateway: /api/job/* → Company Service: /job/*)
    createJob: "/job/create",
    getMyJobs: "/job/my-jobs",
    getAllApplications: "/job/applications",
    getApplicationsByStatus: (status) => `/job/applications?status=${encodeURIComponent(status)}`,
    getJobApplications: (jobId, status) => status ? `/job/${jobId}/applications?status=${encodeURIComponent(status)}` : `/job/${jobId}/applications`,
    updateApplicationStatus: (id) => `/job/application/${id}/status`,

    // Assessment Rules  (Gateway: /api/assessment-rules/* → Company Service: /assessment-rules/*)
    setAssessmentRules: "/assessment-rules/set",
    getRulesByJob: (jobId) => `/assessment-rules/job/${jobId}`,
    updateRules: (id) => `/assessment-rules/${id}`,

    // Interview Scheduling  (Gateway: /api/interview/* → Company Service: /interview/*)
    scheduleInterview: "/interview/schedule",
    getMyInterviews: "/interview",
    rescheduleInterview: (id) => `/interview/${id}/reschedule`,
    cancelInterview: (id) => `/interview/${id}/cancel`,
    submitFeedback: (id) => `/interview/${id}/feedback`,

    // Notifications  (Gateway: /api/company/* → Company Service: /company/*)
    getNotifications: "/company/notifications",
    readNotification: (id) => `/company/notifications/${id}`,
    markAllAsRead: "/company/notifications/read-all",
    clearNotification: (id) => `/company/notifications/clear/${id}`,
  },

  recruiter: {
    // Tokens
    refreshToken: "/recruiter/refresh-token",

    // Join flow (public — no auth required)
    joinCompany: "/recruiter/join-company",
    verifyInviteCode: (code) => `/recruiter/company/invite/verify?code=${encodeURIComponent(code)}`,

    // Membership verification (requires recruiterAuth)
    verifyCompanyMembership: "/recruiter/company/invite/verify-membership",

    // Profile (requires recruiterAuth)
    getProfile: "/recruiter/profile",
    updateProfile: "/recruiter/profile/update",
    updateProfilePicture: "/recruiter/profile/picture",
  },

  candidate: {
    // Authentication
    signup: "/candidate/signup",
    login: "/candidate/login",
    logout: "/candidate/logout",
    getMe: "/candidate/getMe",
    logoutAll: "/candidate/logout-all",

    // Cookies / Tokens
    refreshToken: "/candidate/refresh-token",

    // OTP
    verifyOtp: "/candidate/verify-otp",
    resendOtp: "/candidate/resend-otp",

    // Candidate Profile
    getProfile: "/candidate/profile",
    updateProfile: "/candidate/profile/update",
    addEducation: "/candidate/education",
    updateEducation: (id) => `/candidate/education/${id}`,
    deleteEducation: (id) => `/candidate/education/${id}`,
    addExperience: "/candidate/experience",
    updateExperience: (id) => `/candidate/experience/${id}`,
    deleteExperience: (id) => `/candidate/experience/${id}`,
    addSkills: "/candidate/skills",
    deleteSkills: (skill) => `/candidate/skills/${encodeURIComponent(skill)}`,
    uploadResume: "/candidate/resume",
    deleteResume: "/candidate/resume",
    addSocialLinks: "/candidate/social-links",
    deleteSocialLinks: "/candidate/social-links",

    // Jobs Browsing
    getAllJobs: "/candidate/job",
    getJobById: (id) => `/candidate/job/${id}`,

    // Application Workflow
    checkEligibility: (jobId) => `/application/eligibility/${jobId}`,
    applyJob: "/application/apply",
    submitApplication: "/application/submit",
    appliedJobs: "/application/applied-jobs",
    getApplicationById: (id) => `/application/${id}`,
    withdrawApplication: (id) => `/application/${id}/withdraw`,

    // Assessment
    generateAssessment: (jobId) => `/assessment/generate/${jobId}`,
    evaluateSubmission: "/assessment/evaluate",
    getAssessmentPolicy: (id) => `/assessment/policy/${id}`,
    getAssessmentByJob: (jobId) => `/assessment/job/${jobId}`,
    getAssessmentById: (id) => `/assessment/${id}`,

    // Submission & Proctoring
    startSubmission: "/submission/start",
    getCurrentQuestion: (submissionId) => `/submission/question/${submissionId}`,
    submitAnswer: "/submission/submit-answer",
    logViolation: "/submission/log-violation",
    getSubmissionResult: (submissionId) => `/submission/result/${submissionId}`,
    getMySubmissions: "/submission/my-submissions",

    // Interview
    getUpcomingInterviews: "/candidate/interview/upcoming",
    historyInterviews: "/candidate/interview/history",
    getInterviewDetails: (id) => `/candidate/interview/details/${id}`,

    // Notifications
    allNotification: "/candidate/notifications",
    readNotification: (id) => `/candidate/notifications/read/${id}`,
    markAllAsRead: "/candidate/notifications/all-read",
    clearNotification: (id) => `/candidate/notifications/clear/${id}`,
  },
};

export default endpoint;