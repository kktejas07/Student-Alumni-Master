import re

with open('app/financial.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Restore TABS colors
text = text.replace(
    "{ id: 'scholarships', label: 'Funding',       icon: 'trophy-award' as IconName,    color: '#2563EB', api: '/financial/scholarships/search' },",
    "{ id: 'scholarships', label: 'Funding',       icon: 'trophy-award' as IconName,    color: '#F97316', api: '/financial/scholarships/search' },"
)
text = text.replace(
    "{ id: 'loans',        label: 'Education Loans', icon: 'bank-outline' as IconName,    color: '#2563EB', api: '/financial/loans/search' },",
    "{ id: 'loans',        label: 'Education Loans', icon: 'bank-outline' as IconName,    color: '#3B82F6', api: '/financial/loans/search' },"
)
text = text.replace(
    "{ id: 'startup',      label: 'Startup Funding', icon: 'rocket-launch' as IconName,   color: '#2563EB', api: '/financial/startup-funding/search' },",
    "{ id: 'startup',      label: 'Startup Funding', icon: 'rocket-launch' as IconName,   color: '#14B8A6', api: '/financial/startup-funding/search' },"
)
text = text.replace(
    "{ id: 'investors',    label: 'Investors & VCs', icon: 'trending-up' as IconName,     color: '#2563EB', api: '/financial/venture-capital/search' },",
    "{ id: 'investors',    label: 'Investors & VCs', icon: 'trending-up' as IconName,     color: '#8B5CF6', api: '/financial/venture-capital/search' },"
)
text = text.replace(
    "{ id: 'insurance',    label: 'Insurance',       icon: 'shield-outline' as IconName,  color: '#2563EB', api: '/financial/insurance/search' },",
    "{ id: 'insurance',    label: 'Insurance',       icon: 'shield-outline' as IconName,  color: '#10B981', api: '/financial/insurance/search' },"
)

# Restore individual card tint
text = text.replace(
    "const tint = '#2563EB';",
    "const tint = p.tint || tabInfo.color;"
)

with open('app/financial.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Restored original colors for tabs and cards!")
