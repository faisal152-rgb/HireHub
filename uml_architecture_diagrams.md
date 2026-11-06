# HireHub - Complete UML Architecture & Design Diagrams

This document contains the complete UML diagrams illustrating the architecture, domain entities, and event-driven workflows of **HireHub**.

---

## 1. System Architecture & Event-Driven Topology

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Applications"]
        CP["Candidate Portal (Web/Mobile)"]
        RP["Recruiter Portal (Company Dashboard)"]
    end

    subgraph GatewayLayer ["API Gateway"]
        GW["API Gateway (Port 3000)"]
    end

    subgraph ServicesLayer ["Microservices"]
        subgraph CandidateService ["Candidate / User Service (Port 3003)"]
            UA["Auth & Profiles"]
            UApp["Application Controller"]
            UAss["Assessment & Grading"]
            UInt["Interviews"]
            UNot["Notifications"]
            UConsumer["Kafka Consumer"]
            UProducer["Kafka Producer"]
        end

        subgraph RecruiterService ["Recruiter Service (Port 3002)"]
            RA["Auth & Recruiter Profile"]
            RJob["Job Management"]
            RApp["Applicant Review"]
            RRules["Assessment Rules"]
            RInt["Interview Scheduling"]
            RConsumer["Kafka Consumer"]
            RProducer["Kafka Producer"]
        end
    end

    subgraph MessageBroker ["Kafka Event Bus (Port 9092)"]
        T1["Topic: job-events\n(JOB_CREATED, JOB_UPDATED)"]
        T2["Topic: application-events\n(APPLICATION_SUBMITTED)"]
        T3["Topic: application-status-events\n(APPLICATION_STATUS_UPDATED)"]
        T4["Topic: interview-events\n(INTERVIEW_SCHEDULED)"]
    end

    subgraph DataLayer ["Data Stores"]
        M1[("MongoDB - User DB")]
        M2[("MongoDB - Recruiter DB")]
        RD[("Redis Cache")]
    end

    CP -->|REST / JWT| GW
    RP -->|REST / JWT| GW
    GW -->|Proxy /auth, /profile, /jobs, /application| CandidateService
    GW -->|Proxy /recruiter, /job, /interview| RecruiterService

    CandidateService --> M1
    CandidateService --> RD
    RecruiterService --> M2
    RecruiterService --> RD

    %% Event Flows
    RProducer -->|Publish| T1
    T1 -->|Consume| UConsumer

    UProducer -->|Publish| T2
    T2 -->|Consume| RConsumer

    RProducer -->|Publish| T3
    T3 -->|Consume| UConsumer

    RProducer -->|Publish| T4
    T4 -->|Consume| UConsumer
```

---

## 2. UML Domain Class Diagram

```mermaid
classDiagram
    class User {
        +ObjectId _id
        +String name
        +String email
        +String password
        +String role
        +Boolean isVerified
        +comparePassword(password)
    }

    class CandidateProfile {
        +ObjectId _id
        +ObjectId userId
        +String phone
        +String bio
        +String location
        +List~String~ skills
        +List~Education~ education
        +List~Experience~ experience
        +ResumeObject resume
        +String portfolioUrl
        +String githubUrl
        +String linkedinUrl
        +Boolean isProfileCompleted
    }

    class Company {
        +ObjectId _id
        +ObjectId recruiterId
        +String name
        +String website
        +String industry
        +String location
        +String logo
    }

    class Recruiter {
        +ObjectId _id
        +ObjectId userId
        +ObjectId companyId
        +String name
        +String designation
        +String department
        +String phone
        +Boolean isProfileCompleted
    }

    class Job {
        +ObjectId _id
        +ObjectId companyId
        +ObjectId recruiterId
        +String companyName
        +String title
        +String description
        +List~String~ skillsRequired
        +String jobType
        +String experienceLevel
        +Boolean assessmentRequired
        +ObjectId assessmentId
        +PolicyObject policy
        +String termsAndConditions
        +Number applicationsCount
        +String status
    }

    class AssessmentRules {
        +ObjectId _id
        +ObjectId jobId
        +ObjectId companyId
        +Number totalQuestions
        +Number durationMinutes
        +Number totalMarks
        +Number passingMarks
        +Boolean linearNavigationOnly
        +ProctoringObject proctoring
        +String instructions
    }

    class Application {
        +ObjectId _id
        +ObjectId candidateId
        +ObjectId jobId
        +ObjectId companyId
        +String status
        +ObjectId resumeId
        +ObjectId coverLetterId
        +ObjectId assessmentId
        +Number assessmentScore
        +Boolean assessmentPassed
        +Date appliedAt
    }

    class AssessmentSubmission {
        +ObjectId _id
        +ObjectId assessmentId
        +ObjectId applicationId
        +ObjectId candidateId
        +Number currentQuestionIndex
        +List~Response~ responses
        +ProctoringState proctoring
        +Number totalMarksObtained
        +Number percentage
        +Boolean isPassed
        +String status
        +Date startedAt
        +Date submittedAt
    }

    class Interview {
        +ObjectId _id
        +ObjectId applicationId
        +ObjectId candidateId
        +ObjectId companyId
        +ObjectId jobId
        +String type
        +Date scheduledAt
        +Number duration
        +String meetingLink
        +String status
        +String feedback
        +Number rating
    }

    class Notification {
        +ObjectId _id
        +ObjectId userId
        +String type
        +String title
        +String message
        +ObjectId referenceId
        +Boolean isRead
        +Date readAt
    }

    User "1" --> "1" CandidateProfile : has
    User "1" --> "1" Recruiter : is
    Recruiter "1" --> "1" Company : belongs_to
    Company "1" --> "*" Job : posts
    Job "1" --> "0..1" AssessmentRules : defines
    Job "1" --> "*" Application : receives
    User "1" --> "*" Application : submits
    Application "1" --> "0..1" AssessmentSubmission : includes
    Application "1" --> "*" Interview : schedules
    User "1" --> "*" Notification : receives
```

---

## 3. Candidate Job Application & Assessment Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    participant UserUI as Frontend UI
    participant UserCtrl as Application Controller
    participant DB as User MongoDB
    participant Kafka as Kafka Event Bus
    participant RecruiterSvc as Recruiter Service

    Candidate->>UserUI: 1. Click "Apply Job"
    UserUI->>UserCtrl: GET /application/eligibility/:jobId
    UserCtrl->>DB: Check CandidateProfile (phone, skills, resume)
    
    alt Profile Incomplete
        UserCtrl-->>UserUI: 400 Bad Request (isProfileCompleted: false, missingFields)
        UserUI-->>Candidate: Show "Please Complete Your Profile First"
    else Profile Complete
        UserCtrl-->>UserUI: 200 OK (canProceed: true, policy: 50 MCQs, terms)
        
        Candidate->>UserUI: 2. Review Policy & Instructions
        UserUI->>UserCtrl: POST /application/apply (jobId)
        UserCtrl->>DB: Create Application (status: 'assessment')
        UserCtrl-->>UserUI: 201 Created (applicationId)

        Candidate->>UserUI: 3. Start Assessment Test
        UserUI->>UserCtrl: POST /submit/start (applicationId)
        UserCtrl->>DB: Create AssessmentSubmission (50 MCQs, timer: 45m)
        UserCtrl-->>UserUI: Return Questions (Linear Navigation)

        loop For each Question (1 to 50)
            Candidate->>UserUI: Select Option & Click Next
            UserUI->>UserCtrl: POST /submit/answer (questionIndex, selectedOption)
            UserCtrl->>DB: Grade Answer, Record Score, Advance Index
        end

        Note over UserUI,UserCtrl: Proctoring tracks camera/mic & anti-cheat tab switches

        Candidate->>UserUI: 4. Accept Terms & Conditions & Submit Application
        UserUI->>UserCtrl: POST /application/submit (applicationId, termsAccepted: true)
        UserCtrl->>DB: Update Application (status: 'applied', score, passed: true)
        
        UserCtrl->>Kafka: Publish "APPLICATION_SUBMITTED" (Topic: application-events)
        Kafka->>RecruiterSvc: Consume Event: Save Application & Increment Count
        RecruiterSvc->>RecruiterSvc: Create Recruiter Notification
        
        UserCtrl-->>UserUI: 200 OK (Application Submitted Successfully)
        UserUI-->>Candidate: Confirmation & Tracking Dashboard
    end
```

---

## 4. Interview Scheduling & Candidate Notification Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter
    participant RecruiterUI as Recruiter Dashboard
    participant RecruiterCtrl as Interview Controller
    participant RecruiterDB as Recruiter MongoDB
    participant Kafka as Kafka Event Bus
    participant UserConsumer as User Service Consumer
    participant UserDB as User MongoDB
    actor Candidate

    Recruiter->>RecruiterUI: 1. Review Application & Select "Schedule Interview"
    RecruiterUI->>RecruiterCtrl: POST /interview/schedule (date, type, link, duration)
    RecruiterCtrl->>RecruiterDB: Save Interview Record & Update Application status = 'interview'
    
    RecruiterCtrl->>Kafka: Publish "INTERVIEW_SCHEDULED" (Topic: interview-events)
    Kafka->>UserConsumer: Deliver Message to User Service
    
    UserConsumer->>UserDB: Save Interview to Candidate's DB
    UserConsumer->>UserDB: Insert Notification (type: 'interview_scheduled')
    
    RecruiterCtrl-->>RecruiterUI: 201 Created (Interview Scheduled)
    
    Candidate->>UserDB: GET /notification & GET /interview
    UserDB-->>Candidate: Display Upcoming Interview & Meeting Link
```
