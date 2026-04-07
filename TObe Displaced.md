# GDPR: Feilds to be included

Scope: Analytics scripts only for **pp, tlc, ce, eer**. **mxp**  excluded.
Classification types used: First Name, Middle Name, Last Name, Full Name, Username, Email Address.

<style>
.badge { display:inline-block; padding:1px 8px; border-radius:999px; font-weight:700; line-height:1.2; }
.badge-ok { color:#0f5132; background:#d1e7dd; }
.badge-zero { color:#842029; background:#f8d7da; }

/* Keep wide markdown tables readable in narrow preview panes. */
table {
    display: block;
    width: max-content;
    min-width: 100%;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
}

th,
td {
    padding: 6px 10px;
    vertical-align: top;
    white-space: nowrap;
    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;
}
</style>

## PP (Performance Pro)

### File: pp/scripts/analytics/perfpro_analytics.qvs

| Field Name                         | Line Number | Table Name               | Type          |
| ---------------------------------- | ----------: | ------------------------ | ------------- |
| Employee LastName (in expression)  |          86 | EmployeeName_Map         | Last Name     |
| Employee FirstName (in expression) |          86 | EmployeeName_Map         | First Name    |
| Employee Full Name                 |          86 | EmployeeName_Map         | Full Name     |
| AppraisalRoutes Employee Full Name |         119 | AppraisalRoutes_Employee | Full Name     |
| AppraisalRoutes Employee Email     |         124 | AppraisalRoutes_Employee | Email Address |
| AppraisalRoutes User Name          |         125 | AppraisalRoutes_Employee | Username      |
| Appraiser Employee Full Name       |         181 | Appraiser_Employee       | Full Name     |
| Appraiser Employee Email           |         191 | Appraiser_Employee       | Email Address |
| Appraiser User Name                |         192 | Appraiser_Employee       | Username      |
| Subject Employee Name              |         240 | Forms                    | Full Name     |
| Respondent or Recipient Name       |         242 | Forms                    | Full Name     |
| recipient_email                    |         247 | Forms                    | Email Address |
| MultiAppraiser Employee Full Name  |         298 | MultiAppraiser_Employee  | Full Name     |
| MultiAppraiser Employee Email      |         308 | MultiAppraiser_Employee  | Email Address |
| MultiAppraiser User Name           |         309 | MultiAppraiser_Employee  | Username      |
| Employee Full Name                 |         410 | SelfAppraiser_Employee   | Full Name     |
| Employee Email                     |         421 | SelfAppraiser_Employee   | Email Address |
| Employee User Name                 |         423 | SelfAppraiser_Employee   | Username      |
| Downline Name                      |         544 | EmployeeDownline         | Full Name     |
| Upline Name                        |         545 | EmployeeDownline         | Full Name     |

### File: pp/scripts/analytics/perfpro_analytics_unit_admin.qvs

| Field Name                         | Line Number | Table Name               | Type          |
| ---------------------------------- | ----------: | ------------------------ | ------------- |
| Employee LastName (in expression)  |          94 | EmployeeName_Map         | Last Name     |
| Employee FirstName (in expression) |          94 | EmployeeName_Map         | First Name    |
| Employee Full Name                 |          94 | EmployeeName_Map         | Full Name     |
| AppraisalRoutes Employee Full Name |         126 | AppraisalRoutes_Employee | Full Name     |
| AppraisalRoutes Employee Email     |         131 | AppraisalRoutes_Employee | Email Address |
| AppraisalRoutes User Name          |         132 | AppraisalRoutes_Employee | Username      |
| Appraiser Employee Full Name       |         179 | Appraiser_Employee       | Full Name     |
| Appraiser Employee Email           |         189 | Appraiser_Employee       | Email Address |
| Appraiser User Name                |         190 | Appraiser_Employee       | Username      |
| Subject Employee Name              |         238 | Forms                    | Full Name     |
| Respondent or Recipient Name       |         240 | Forms                    | Full Name     |
| recipient_email                    |         245 | Forms                    | Email Address |
| MultiAppraiser Employee Full Name  |         296 | MultiAppraiser_Employee  | Full Name     |
| MultiAppraiser Employee Email      |         306 | MultiAppraiser_Employee  | Email Address |
| MultiAppraiser User Name           |         307 | MultiAppraiser_Employee  | Username      |
| Employee Full Name                 |         409 | SelfAppraiser_Employee   | Full Name     |
| Employee Email                     |         420 | SelfAppraiser_Employee   | Email Address |
| Employee User Name                 |         422 | SelfAppraiser_Employee   | Username      |
| Downline Name                      |         543 | EmployeeDownline         | Full Name     |
| Upline Name                        |         544 | EmployeeDownline         | Full Name     |

### File: pp/scripts/analytics/perfpro_appraiser_analytics.qvs

| Field Name                         | Line Number | Table Name              | Type          |
| ---------------------------------- | ----------: | ----------------------- | ------------- |
| Employee LastName (in expression)  |         124 | Employee_Temp           | Last Name     |
| Employee FirstName (in expression) |         124 | Employee_Temp           | First Name    |
| Employee Full Name                 |         124 | Employee_Temp           | Full Name     |
| Employee Email                     |         134 | Employee_Temp           | Email Address |
| Employee User Name                 |         135 | Employee_Temp           | Username      |
| Employee Full Name                 |         143 | EmployeeName_Map        | Full Name     |
| Downline Name                      |         162 | EmployeeDownline        | Full Name     |
| Upline Name                        |         163 | EmployeeDownline        | Full Name     |
| Employee Name                      |         195 | All_Forms               | Full Name     |
| Subject Employee Name              |         196 | All_Forms               | Full Name     |
| Form Fill Employee Name            |         197 | All_Forms               | Full Name     |
| Respondent or Recipient Name       |         202 | All_Forms               | Full Name     |
| Employee Full Name                 |         249 | Employee                | Full Name     |
| Employee Email                     |         259 | Employee                | Email Address |
| Employee User Name                 |         260 | Employee                | Username      |
| MultiAppraiser Employee Full Name  |         304 | MultiAppraiser_Employee | Full Name     |
| Appraiser Employee Full Name       |         313 | Appraiser_Employee      | Full Name     |
| Appraiser Employee Email           |         323 | Appraiser_Employee      | Email Address |
| Appraiser User Name                |         324 | Appraiser_Employee      | Username      |

### File: pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs

| Field Name                         | Line Number | Table Name              | Type          |
| ---------------------------------- | ----------: | ----------------------- | ------------- |
| Employee LastName (in expression)  |         122 | Employee_Temp           | Last Name     |
| Employee FirstName (in expression) |         122 | Employee_Temp           | First Name    |
| Employee Full Name                 |         122 | Employee_Temp           | Full Name     |
| Employee Email                     |         132 | Employee_Temp           | Email Address |
| Employee User Name                 |         133 | Employee_Temp           | Username      |
| Employee Full Name                 |         141 | EmployeeName_Map        | Full Name     |
| Downline Name                      |         160 | EmployeeDownline        | Full Name     |
| Upline Name                        |         161 | EmployeeDownline        | Full Name     |
| Employee Name                      |         193 | All_Forms               | Full Name     |
| Subject Employee Name              |         194 | All_Forms               | Full Name     |
| Form Fill Employee Name            |         195 | All_Forms               | Full Name     |
| Respondent or Recipient Name       |         200 | All_Forms               | Full Name     |
| Employee Full Name                 |         247 | Employee                | Full Name     |
| Employee Email                     |         257 | Employee                | Email Address |
| Employee User Name                 |         258 | Employee                | Username      |
| MultiAppraiser Employee Full Name  |         302 | MultiAppraiser_Employee | Full Name     |
| Appraiser Employee Full Name       |         311 | Appraiser_Employee      | Full Name     |
| Appraiser Employee Email           |         321 | Appraiser_Employee      | Email Address |
| Appraiser User Name                |         322 | Appraiser_Employee      | Username      |

## TLC (Learning Center)

### File: tlc/scripts/analytics/tlc_analytics.qvs

| Field Name                                      | Line Number | Table Name   | Type          |
| ----------------------------------------------- | ----------: | ------------ | ------------- |
| EmployeeName (via LOAD * from EmployeeInfo.qvd) |         123 | EmployeeInfo | Full Name     |
| ManagerName (via LOAD * from EmployeeInfo.qvd)  |         123 | EmployeeInfo | Full Name     |
| Email (via LOAD * from EmployeeInfo.qvd)        |         123 | EmployeeInfo | Email Address |
| DownlineName                                    |         141 | DownlineView | Full Name     |
| UplineName                                      |         142 | DownlineView | Full Name     |

## CE (Compease)

### File: ce/scripts/analytics/compease_analytics.qvs

| Field Name                                        | Line Number | Table Name              | Type          |
| ------------------------------------------------- | ----------: | ----------------------- | ------------- |
| M. Emp. Name (via LOAD * from Merit_Plans.qvd)    |          38 | Merit Increase Planning | Full Name     |
| M. First Name (via LOAD * from Merit_Plans.qvd)   |          38 | Merit Increase Planning | First Name    |
| M. Middle Name (via LOAD * from Merit_Plans.qvd)  |          38 | Merit Increase Planning | Middle Name   |
| M. Last Name (via LOAD * from Merit_Plans.qvd)    |          38 | Merit Increase Planning | Last Name     |
| Full Name (via LOAD * from Employee_Master.qvd)   |          44 | Employee Master         | Full Name     |
| First Name (via LOAD * from Employee_Master.qvd)  |          44 | Employee Master         | First Name    |
| Middle Name (via LOAD * from Employee_Master.qvd) |          44 | Employee Master         | Middle Name   |
| Last Name (via LOAD * from Employee_Master.qvd)   |          44 | Employee Master         | Last Name     |
| Email (via LOAD * from Employee_Master.qvd)       |          44 | Employee Master         | Email Address |

### File: ce/scripts/analytics/compease_analytics_historical.qvs

| Field Name                                        | Line Number | Table Name              | Type          |
| ------------------------------------------------- | ----------: | ----------------------- | ------------- |
| M. Emp. Name (via LOAD * from Merit_Plans.qvd)    |          40 | Merit Increase Planning | Full Name     |
| M. First Name (via LOAD * from Merit_Plans.qvd)   |          40 | Merit Increase Planning | First Name    |
| M. Middle Name (via LOAD * from Merit_Plans.qvd)  |          40 | Merit Increase Planning | Middle Name   |
| M. Last Name (via LOAD * from Merit_Plans.qvd)    |          40 | Merit Increase Planning | Last Name     |
| Full Name (via LOAD * from Employee_Master.qvd)   |          53 | Employee Master         | Full Name     |
| First Name (via LOAD * from Employee_Master.qvd)  |          53 | Employee Master         | First Name    |
| Middle Name (via LOAD * from Employee_Master.qvd) |          53 | Employee Master         | Middle Name   |
| Last Name (via LOAD * from Employee_Master.qvd)   |          53 | Employee Master         | Last Name     |
| Email (via LOAD * from Employee_Master.qvd)       |          53 | Employee Master         | Email Address |

### File: ce/scripts/analytics/compease_internal.qvs

| Field Name                              | Line Number | Table Name | Type |
| --------------------------------------- | ----------: | ---------- | ---- |
| No qualifying name-related fields found |           - | -          | -    |

## EER (Engagement and Recognition)

### File: eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs

| Field Name                         | Line Number | Table Name                   | Type          |
| ---------------------------------- | ----------: | ---------------------------- | ------------- |
| Employee LastName (in expression)  |         158 | Employee_Temp                | Last Name     |
| Employee FirstName (in expression) |         158 | Employee_Temp                | First Name    |
| Employee Full Name                 |         158 | Employee_Temp                | Full Name     |
| Employee Email                     |         168 | Employee_Temp                | Email Address |
| Employee User Name                 |         169 | Employee_Temp                | Username      |
| Employee Full Name                 |         178 | EmployeeName_Map             | Full Name     |
| Downline Name                      |         198 | EmployeeDownline             | Full Name     |
| Upline Name                        |         199 | EmployeeDownline             | Full Name     |
| Employee Full Name                 |         224 | Employee                     | Full Name     |
| Employee Email                     |         234 | Employee                     | Email Address |
| Employee User Name                 |         235 | Employee                     | Username      |
| Appraiser Employee Full Name       |         350 | Appraiser_Employee           | Full Name     |
| Appraiser Employee Email           |         360 | Appraiser_Employee           | Email Address |
| Appraiser User Name                |         361 | Appraiser_Employee           | Username      |
| FromEmployeeFullName               |         651 | Mapping_Criterion_Type_Id    | Full Name     |
| BadgeCreatedByEmployeeFullName     |         723 | BADGE                        | Full Name     |
| TargetCreateByEmployeeFullName     |         857 | Temp_Employee_DownlineUpline | Full Name     |
| TargetParticipantFullName          |         876 | TargetEmployee               | Full Name     |

---
---

## Export Inventory Dashboard

### PP (Performance Pro) Inventory

| Analytics File                                              | Exported Table                    |                            Values Found | Load/Select Type      | Reference Source (if LOAD */SELECT)                                                                                                               |
| ----------------------------------------------------------- | --------------------------------- | --------------------------------------: | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Users                             | <span class="badge badge-zero">0</span> | LOAD * Resident       | $(vQVD_DataModelFolder)Users.qvd; INLINE; lib://QVD_FOLDER_COMPEASE/DataFiles/Admin_User_List.xlsx                                                |
| pp/scripts/analytics/perfpro_analytics.qvs                  | EmployeeName_Map                  |   <span class="badge badge-ok">3</span> | Other                 | $(vQVD_ExtractionFolder)Employee.qvd                                                                                                              |
| pp/scripts/analytics/perfpro_analytics.qvs                  | AppraisalRecordType               | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraisalRecordType.qvd                                                                                                    |
| pp/scripts/analytics/perfpro_analytics.qvs                  | AppraisalRoute                    | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraisalRoute.qvd                                                                                                         |
| pp/scripts/analytics/perfpro_analytics.qvs                  | AppraisalRoutes_Employee          |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraisalRoutes_Employee.qvd                                                                                               |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Appraiser_Criterion_Comment       | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Criterion_Comment.qvd                                                                                            |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Appraiser_Criterion               | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Criterion.qvd; Resident:Appraiser_Criterion                                                                      |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Appraiser_Employee                |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Employee.qvd                                                                                                     |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Appraiser                         | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser.qvd                                                                                                              |
| pp/scripts/analytics/perfpro_analytics.qvs                  | QuestionType_Map                  | <span class="badge badge-zero">0</span> | MAPPING LOAD * INLINE | INLINE                                                                                                                                            |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Forms                             |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_ExtractionFolder)Forms_.qvd                                                                                                                |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Multi_Appraiser_Criterion_Comment | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Multi_Appraiser_Criterion_Comment.qvd                                                                                      |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Multi_Appraiser_Criterion         | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Multi_Appraiser_Criterion.qvd                                                                                              |
| pp/scripts/analytics/perfpro_analytics.qvs                  | MultiAppraiser_Employee           |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiser_Employee.qvd                                                                                                |
| pp/scripts/analytics/perfpro_analytics.qvs                  | MultiAppraiser                    | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiser.qvd                                                                                                         |
| pp/scripts/analytics/perfpro_analytics.qvs                  | MultiAppraiserSummaryComment      | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiserSummaryComment.qvd                                                                                           |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Self_Appraiser_Criterion_Comment  | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Self_Appraiser_Criterion_Comment.qvd                                                                                       |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Self_Appraiser_Criterion          | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Self_Appraiser_Criterion.qvd                                                                                               |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Self_Appraiser                    | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Self_Appraiser.qvd                                                                                                         |
| pp/scripts/analytics/perfpro_analytics.qvs                  | SelfAppraiserSummaryComment       | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)SelfAppraiserSummaryComment.qvd                                                                                            |
| pp/scripts/analytics/perfpro_analytics.qvs                  | SelfAppraiser_Employee            |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)SelfAppraiser_Employee.qvd                                                                                                 |
| pp/scripts/analytics/perfpro_analytics.qvs                  | AppraiserSummaryComment           | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraiserSummaryComment.qvd                                                                                                |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Appraisal_Summary_Fact            | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraisal_Summary_Fact.qvd                                                                                                 |
| pp/scripts/analytics/perfpro_analytics.qvs                  | EmployeeDownline                  |   <span class="badge badge-ok">2</span> | Explicit LOAD         | $(vQVD_DataModelFolder)EmployeeDownline.qvd                                                                                                       |
| pp/scripts/analytics/perfpro_analytics.qvs                  | CustomFields                      | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)CustomFields.qvd                                                                                                           |
| pp/scripts/analytics/perfpro_analytics.qvs                  | Upcoming_Appraisals_Ranges        | <span class="badge badge-zero">0</span> | LOAD * INLINE         | INLINE; Resident:Upcoming_Appraisals_Ranges                                                                                                       |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Employee_Orgs                     | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Users_Unit_Admin.qvd                                                                                                       |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Temp_Users                        | <span class="badge badge-zero">0</span> | LOAD * INLINE         | $(vQVD_DataModelFolder)Users_Unit_Admin.qvd; INLINE; lib://QVD_FOLDER_COMPEASE/DataFiles/Admin_User_List.xlsx                                     |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Users                             | <span class="badge badge-zero">0</span> | LOAD * Resident       | Resident:Temp_Users                                                                                                                               |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | EmployeeName_Map                  |   <span class="badge badge-ok">3</span> | Other                 | $(vQVD_ExtractionFolder)Employee.qvd                                                                                                              |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | AppraisalRecordType               | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraisalRecordType.qvd                                                                                                    |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | AppraisalRoute                    | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraisalRoute.qvd                                                                                                         |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | AppraisalRoutes_Employee          |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraisalRoutes_Employee.qvd                                                                                               |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Appraiser_Criterion_Comment       | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Criterion_Comment.qvd                                                                                            |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Appraiser_Criterion               | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Criterion.qvd; Resident:Appraiser_Criterion                                                                      |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Appraiser_Employee                |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Employee.qvd                                                                                                     |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Appraiser                         | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser.qvd                                                                                                              |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | QuestionType_Map                  | <span class="badge badge-zero">0</span> | MAPPING LOAD * INLINE | INLINE                                                                                                                                            |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Forms                             |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_ExtractionFolder)Forms_.qvd                                                                                                                |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Multi_Appraiser_Criterion_Comment | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Multi_Appraiser_Criterion_Comment.qvd                                                                                      |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Multi_Appraiser_Criterion         | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Multi_Appraiser_Criterion.qvd                                                                                              |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | MultiAppraiser_Employee           |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiser_Employee.qvd                                                                                                |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | MultiAppraiser                    | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiser.qvd                                                                                                         |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | MultiAppraiserSummaryComment      | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiserSummaryComment.qvd                                                                                           |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Self_Appraiser_Criterion_Comment  | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Self_Appraiser_Criterion_Comment.qvd                                                                                       |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Self_Appraiser_Criterion          | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Self_Appraiser_Criterion.qvd                                                                                               |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Self_Appraiser                    | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Self_Appraiser.qvd                                                                                                         |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | SelfAppraiserSummaryComment       | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)SelfAppraiserSummaryComment.qvd                                                                                            |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | SelfAppraiser_Employee            |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)SelfAppraiser_Employee.qvd                                                                                                 |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | AppraiserSummaryComment           | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraiserSummaryComment.qvd                                                                                                |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Appraisal_Summary_Fact            | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraisal_Summary_Fact.qvd                                                                                                 |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | EmployeeDownline                  |   <span class="badge badge-ok">2</span> | Explicit LOAD         | $(vQVD_DataModelFolder)EmployeeDownline.qvd                                                                                                       |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | CustomFields                      | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)CustomFields.qvd                                                                                                           |
| pp/scripts/analytics/perfpro_analytics_unit_admin.qvs       | Upcoming_Appraisals_Ranges        | <span class="badge badge-zero">0</span> | LOAD * INLINE         | INLINE; Resident:Upcoming_Appraisals_Ranges                                                                                                       |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | Users                             | <span class="badge badge-zero">0</span> | LOAD * Resident       | $(vQVD_ExtractionFolder)AllUsers_Appraisers.qvd; lib://QVD_FOLDER_HR_PERFORMANCE/DataFiles/Admin_User_List.xlsx; INLINE                           |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | Employee_Temp                     |   <span class="badge badge-ok">5</span> | Explicit LOAD         | $(vQVD_ExtractionFolder)Employee.qvd                                                                                                              |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | EmployeeName_Map                  |   <span class="badge badge-ok">1</span> | Other                 | Resident:Employee_Temp                                                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | EmployeeActive_Map                | <span class="badge badge-zero">0</span> | Other                 | Resident:Employee_Temp                                                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | EmployeeDownline                  |   <span class="badge badge-ok">2</span> | Explicit LOAD         | $(vQVD_ExtractionFolder)Employee_Downline_.qvd                                                                                                    |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | QuestionType_Map                  | <span class="badge badge-zero">0</span> | MAPPING LOAD * INLINE | INLINE                                                                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | All_Forms                         |   <span class="badge badge-ok">4</span> | LOAD * Resident       | $(vQVD_ExtractionFolder)Forms_.qvd; Resident:All_Forms                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | Employee                          |   <span class="badge badge-ok">3</span> | Explicit LOAD         | Resident:Employee_Temp                                                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | AppraisalRecordType               | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraisalRecordType.qvd                                                                                                    |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | MultiAppraiser                    | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiser.qvd                                                                                                         |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | MultiAppraiser_Employee           |   <span class="badge badge-ok">1</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiser_Employee.qvd                                                                                                |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | Appraiser_Employee                |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Employee.qvd                                                                                                     |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | Appraiser                         | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser.qvd                                                                                                              |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | Appraiser_Criterion               | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Criterion.qvd                                                                                                    |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | Appraiser_Criterion_Comment       | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Criterion_Comment.qvd                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | AppraiserSummaryComment           | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraiserSummaryComment.qvd                                                                                                |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | SelfAppraiser_Employee            | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)SelfAppraiser_Employee.qvd                                                                                                 |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | AllowAppraiserView_Map            | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_ExtractionFolder)Active_Client_List.qvd                                                                                                    |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | Appraisal_Summary_Fact            | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraisal_Summary_Fact.qvd; $(vQVD_DataModelFolder)Self_Appraiser.qvd; $(vQVD_DataModelFolder)Self_Appraiser_Criterion.qvd |
| pp/scripts/analytics/perfpro_appraiser_analytics.qvs        | Appraisal_Summary_Fact_Final      | <span class="badge badge-zero">0</span> | Explicit LOAD         | Resident:Appraisal_Summary_Fact                                                                                                                   |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | Users                             | <span class="badge badge-zero">0</span> | LOAD * Resident       | $(vQVD_ExtractionFolder)AllUsers_Appraisers.qvd; lib://QVD_FOLDER_HR_PERFORMANCE/DataFiles/Admin_User_List.xlsx; INLINE                           |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | Employee_Temp                     |   <span class="badge badge-ok">5</span> | Explicit LOAD         | $(vQVD_ExtractionFolder)Employee.qvd                                                                                                              |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | EmployeeName_Map                  |   <span class="badge badge-ok">1</span> | Other                 | Resident:Employee_Temp                                                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | EmployeeActive_Map                | <span class="badge badge-zero">0</span> | Other                 | Resident:Employee_Temp                                                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | EmployeeDownline                  |   <span class="badge badge-ok">2</span> | Explicit LOAD         | $(vQVD_ExtractionFolder)Employee_Downline_.qvd                                                                                                    |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | QuestionType_Map                  | <span class="badge badge-zero">0</span> | MAPPING LOAD * INLINE | INLINE                                                                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | All_Forms                         |   <span class="badge badge-ok">4</span> | LOAD * Resident       | $(vQVD_ExtractionFolder)Forms_.qvd; Resident:All_Forms                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | Employee                          |   <span class="badge badge-ok">3</span> | Explicit LOAD         | Resident:Employee_Temp                                                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | AppraisalRecordType               | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraisalRecordType.qvd                                                                                                    |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | MultiAppraiser                    | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiser.qvd                                                                                                         |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | MultiAppraiser_Employee           |   <span class="badge badge-ok">1</span> | Explicit LOAD         | $(vQVD_DataModelFolder)MultiAppraiser_Employee.qvd                                                                                                |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | Appraiser_Employee                |   <span class="badge badge-ok">3</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Employee.qvd                                                                                                     |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | Appraiser                         | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser.qvd                                                                                                              |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | Appraiser_Criterion               | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Criterion.qvd                                                                                                    |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | Appraiser_Criterion_Comment       | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraiser_Criterion_Comment.qvd                                                                                            |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | AppraiserSummaryComment           | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)AppraiserSummaryComment.qvd                                                                                                |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | Self_Appraiser                    | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Self_Appraiser.qvd                                                                                                         |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | SelfAppraiser_Employee            | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)SelfAppraiser_Employee.qvd                                                                                                 |
| pp/scripts/analytics/perfpro_appraiser_analytics_phase3.qvs | Appraisal_Summary_Fact            | <span class="badge badge-zero">0</span> | Explicit LOAD         | $(vQVD_DataModelFolder)Appraisal_Summary_Fact.qvd                                                                                                 |

---

### TLC (Learning Center) Inventory

| Analytics File                          | Exported Table            |                            Values Found | Load/Select Type | Reference Source (if LOAD */SELECT)                                                                                                      |
| --------------------------------------- | ------------------------- | --------------------------------------: | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| tlc/scripts/analytics/tlc_analytics.qvs | Users                     | <span class="badge badge-zero">0</span> | LOAD * INLINE    | lib://QVD_FOLDER_LEARNING_CENTER/qvdextraction/TLC_User_List.qvd; INLINE; lib://QVD_FOLDER_HR_PERFORMANCE/DataFiles/Admin_User_List.xlsx |
| tlc/scripts/analytics/tlc_analytics.qvs | EmployeeRegistrationsFact | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_DataModelFolder)EmployeeRegistrationsFact.qvd                                                                                     |
| tlc/scripts/analytics/tlc_analytics.qvs | CourseInfo                | <span class="badge badge-zero">0</span> | LOAD * FROM      | $(vQVD_DataModelFolder)CourseInfo.qvd                                                                                                    |
| tlc/scripts/analytics/tlc_analytics.qvs | EmployeeInfo              |   <span class="badge badge-ok">3</span> | LOAD * FROM      | $(vQVD_DataModelFolder)EmployeeInfo.qvd                                                                                                  |
| tlc/scripts/analytics/tlc_analytics.qvs | DownlineView              |   <span class="badge badge-ok">2</span> | Explicit LOAD    | $(vQVD_DataModelFolder)DownlineView.qvd; Resident:EmployeeInfo                                                                           |
| tlc/scripts/analytics/tlc_analytics.qvs | EmployeeGroup             | <span class="badge badge-zero">0</span> | LOAD * FROM      | $(vQVD_DataModelFolder)EmployeeGroup.qvd                                                                                                 |
| tlc/scripts/analytics/tlc_analytics.qvs | LearningObject            | <span class="badge badge-zero">0</span> | LOAD * FROM      | $(vQVD_DataModelFolder)LearningObject.qvd                                                                                                |
| tlc/scripts/analytics/tlc_analytics.qvs | LearningPlanTraining      | <span class="badge badge-zero">0</span> | LOAD * FROM      | $(vQVD_DataModelFolder)LearningPlanTraining.qvd; $(vQVD_DataModelFolder)LearningTypeDim.qvd                                              |

---

### CE (Compease) Inventory

| Analytics File                                         | Exported Table          |                            Values Found | Load/Select Type | Reference Source (if LOAD */SELECT)                                                                                                                 |
| ------------------------------------------------------ | ----------------------- | --------------------------------------: | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ce/scripts/analytics/compease_analytics.qvs            | Users                   | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_DataModelFolder)Users.qvd                                                                                                                    |
| ce/scripts/analytics/compease_analytics.qvs            | Authorization           | <span class="badge badge-zero">0</span> | LOAD * Resident  | Resident:Users                                                                                                                                      |
| ce/scripts/analytics/compease_analytics.qvs            | Clients                 | <span class="badge badge-zero">0</span> | LOAD * FROM      | $(vQVD_DataModelFolder)Clients.qvd                                                                                                                  |
| ce/scripts/analytics/compease_analytics.qvs            | Merit Increase Planning |   <span class="badge badge-ok">4</span> | LOAD * FROM      | lib://QVD_FOLDER_COMPEASE/qvddatamodel\Merit_Plans.qvd; Merit Increase Planning                                                                     |
| ce/scripts/analytics/compease_analytics.qvs            | Employee Master         |   <span class="badge badge-ok">5</span> | LOAD * FROM      | lib://QVD_FOLDER_COMPEASE/qvddatamodel\Employee_Master.qvd; Employee Master                                                                         |
| ce/scripts/analytics/compease_analytics.qvs            | Market Variable Pay     | <span class="badge badge-zero">0</span> | LOAD * FROM      | lib://QVD_FOLDER_COMPEASE/qvddatamodel\Market_Variable_Pay.qvd                                                                                      |
| ce/scripts/analytics/compease_analytics_historical.qvs | Users                   | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_DataModelFolder)Users.qvd                                                                                                                    |
| ce/scripts/analytics/compease_analytics_historical.qvs | Authorization           | <span class="badge badge-zero">0</span> | LOAD * Resident  | Resident:Users                                                                                                                                      |
| ce/scripts/analytics/compease_analytics_historical.qvs | Clients                 | <span class="badge badge-zero">0</span> | LOAD * FROM      | $(vQVD_DataModelFolder)Clients.qvd                                                                                                                  |
| ce/scripts/analytics/compease_analytics_historical.qvs | Merit Increase Planning |   <span class="badge badge-ok">4</span> | Explicit LOAD    | lib://QVD_FOLDER_COMPEASE/qvddatamodel/Merit_Plans.qvd; lib://QVD_FOLDER_COMPEASE/$(lastYear)/qvddatamodel/Merit_Plans.qvd; Merit Increase Planning |
| ce/scripts/analytics/compease_analytics_historical.qvs | Employee Master         |   <span class="badge badge-ok">5</span> | Explicit LOAD    | lib://QVD_FOLDER_COMPEASE/qvddatamodel/Employee_Master.qvd; lib://QVD_FOLDER_COMPEASE/$(lastYear)/qvddatamodel/Employee_Master.qvd; Employee Master |
| ce/scripts/analytics/compease_analytics_historical.qvs | Market Variable Pay     | <span class="badge badge-zero">0</span> | Explicit LOAD    | lib://QVD_FOLDER_COMPEASE/qvddatamodel/Market_Variable_Pay.qvd; lib://QVD_FOLDER_COMPEASE/$(lastYear)/qvddatamodel/Market_Variable_Pay.qvd          |
| ce/scripts/analytics/compease_internal.qvs             | Users                   | <span class="badge badge-zero">0</span> | LOAD * INLINE    | $(vQVDFolderConnection)DataFiles\Admin_User_List.xlsx; INLINE                                                                                       |
| ce/scripts/analytics/compease_internal.qvs             | Authorization           | <span class="badge badge-zero">0</span> | LOAD * Resident  | Resident:Users                                                                                                                                      |
| ce/scripts/analytics/compease_internal.qvs             | Clients                 | <span class="badge badge-zero">0</span> | LOAD * FROM      | $(vQVD_DataModelFolder)Clients.qvd                                                                                                                  |
| ce/scripts/analytics/compease_internal.qvs             | Job Evaluations         | <span class="badge badge-zero">0</span> | LOAD * FROM      | lib://QVD_FOLDER_COMPEASE/qvddatamodel/Job_Evaluations.qvd                                                                                          |

---

### EER (Engagement and Recognition) Inventory

| Analytics File                                                 | Exported Table                    |                            Values Found | Load/Select Type | Reference Source (if LOAD */SELECT)                                                                                                                         |
| -------------------------------------------------------------- | --------------------------------- | --------------------------------------: | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Users                             | <span class="badge badge-zero">0</span> | LOAD * INLINE    | $(vQVD_DataModelFolder)Users.qvd; $(vQVD_ExtractionFolder)AllUsers_Appraisers.qvd; lib://QVD_FOLDER_HR_PERFORMANCE/DataFiles/Admin_User_List.xlsx           |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | New_Users                         | <span class="badge badge-zero">0</span> | LOAD * Resident  | Resident:Users                                                                                                                                              |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Employee_Temp                     |   <span class="badge badge-ok">5</span> | Explicit LOAD    | $(vQVD_ExtractionFolder)Employee.qvd                                                                                                                        |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | EmployeeName_Map                  |   <span class="badge badge-ok">1</span> | Other            | Resident:Employee_Temp                                                                                                                                      |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | EmployeeActive_Map                | <span class="badge badge-zero">0</span> | Other            | Resident:Employee_Temp                                                                                                                                      |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | EmployeeDownline                  |   <span class="badge badge-ok">2</span> | Explicit LOAD    | $(vQVD_ExtractionFolder)Employee_Downline_.qvd                                                                                                              |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Employee                          |   <span class="badge badge-ok">3</span> | Explicit LOAD    | Resident:Employee_Temp                                                                                                                                      |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Temp_Employee_Auth_Details        | <span class="badge badge-zero">0</span> | Explicit LOAD    | Resident:Employee; Resident:EmployeeDownline                                                                                                                |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Employee_Auth_Details             | <span class="badge badge-zero">0</span> | Explicit LOAD    | Resident:Temp_Employee_Auth_Details                                                                                                                         |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Auth_Link                         | <span class="badge badge-zero">0</span> | Explicit LOAD    | Resident:Employee_Auth_Details                                                                                                                              |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Appraiser                         | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_DataModelFolder)Appraiser.qvd                                                                                                                        |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Appraiser_Employee                |   <span class="badge badge-ok">3</span> | Explicit LOAD    | $(vQVD_DataModelFolder)Appraiser_Employee.qvd                                                                                                               |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Appraisal_Summary_Fact            | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_DataModelFolder)Appraisal_Summary_Fact.qvd                                                                                                           |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Client_Access                     | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsExtractionFolder)Active_Client_List_Teams.qvd                                                                                                   |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | PillarComments                    | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)engagement_category_comment.qvd                                                                                                 |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | PillarScoresAndTargets            | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)PillarScoresAndTargets.qvd                                                                                                      |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Current_Pillar_Scores_and_Targets | <span class="badge badge-zero">0</span> | Explicit LOAD    | Resident:PillarScoresAndTargets                                                                                                                             |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | PillarCategories                  | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)engagement_category.qvd                                                                                                         |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | PulseScore                        | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)employee_pulse.qvd                                                                                                              |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | PulseComments                     | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)employee_pulse_comment.qvd                                                                                                      |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | RECOGNITION                       | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)recognition.qvd                                                                                                                 |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Mapping_Rec_Target_Id             | <span class="badge badge-zero">0</span> | Other            | $(vQVD_TeamsDataModelFolder)recognition.qvd                                                                                                                 |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Mapping_Type                      | <span class="badge badge-zero">0</span> | Other            | Resident:RECOGNITION                                                                                                                                        |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Mapping_Criterion_Library_Id      | <span class="badge badge-zero">0</span> | Other            | Resident:RECOGNITION                                                                                                                                        |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Mapping_Criterion_Id              | <span class="badge badge-zero">0</span> | Other            | Resident:RECOGNITION                                                                                                                                        |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Mapping_Criterion_Type_Id         |   <span class="badge badge-ok">1</span> | Explicit LOAD    | Resident:RECOGNITION; lib://QVD_FOLDER_INTEGRATED_TEAMS_IQ/qvddatamodel/rec_comment.qvd; lib://QVD_FOLDER_INTEGRATED_TEAMS_IQ/qvddatamodel/rec_employee.qvd |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Temp_Recognition                  | <span class="badge badge-zero">0</span> | Explicit LOAD    | Resident:RECOGNITION; Resident:TargetEmployee                                                                                                               |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | EMPLOYEE_POINTS                   | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)rec_employee_points.qvd                                                                                                         |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | BADGE                             |   <span class="badge badge-ok">1</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)rec_badge.qvd; Resident:Employee; Resident:BADGE                                                                                |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | TARGET                            | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)rec_target.qvd; Resident:TARGET                                                                                                 |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Temp_No_Recognition_Targets       | <span class="badge badge-zero">0</span> | Explicit LOAD    | Resident:TARGET                                                                                                                                             |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | Temp_Employee_DownlineUpline      |   <span class="badge badge-ok">1</span> | Explicit LOAD    | Resident:Employee_Auth_Details; Resident:Temp_Employee_DownlineUpline; Resident:Temp_No_Recognition_Targets                                                 |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | TargetEmployee                    |   <span class="badge badge-ok">1</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)rec_target_employee.qvd; Resident:Employee                                                                                      |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | TargetComment                     | <span class="badge badge-zero">0</span> | Explicit LOAD    | $(vQVD_TeamsDataModelFolder)rec_target_comment.qvd                                                                                                          |
| eer/scripts/analytics/Engagement_and_Recognition_Analytics.qvs | autoCalendar                      | <span class="badge badge-zero">0</span> | Other            | -                                                                                                                                                           |
