export const taskCategoryValues = [
    "MultiSector",
    "Health",
    "Cleaning",
    "Construction",
    "Auto",
    "Tech",
    "Finance",
    "Hospitality",
    "Legal",
    "Education",
  ] as const
  export type TaskCategoryValue = (typeof taskCategoryValues)[number]
  
  export const taskStatusValues = [
    "Active",
    "Pending",
    "Rejected",
    "Published",
    "Done",
    "Cancelled",
  ] as const
  export type TaskStatusValue = (typeof taskStatusValues)[number]

  export const BudgetTypeValues = [
    "Fixed",
    "Negotiable",
  ] as const
  export type TaskBudgetValue = (typeof BudgetTypeValues)[number]
  
  