const FORM_BASE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfgqyEROIK7Ihd0x6SphDuDcCDt-yMhZCOfwjwjeQF2vVc4ag/viewform'

const PROJECT_ID_ENTRY = 'entry.1005265204'

export function getFormularioLink(projectId: string) {
  const params = new URLSearchParams({
    usp: 'pp_url',
    [PROJECT_ID_ENTRY]: projectId,
  })
  return `${FORM_BASE_URL}?${params.toString()}`
}