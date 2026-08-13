import { useQuery } from '@tanstack/react-query';
import { getStakeholderEngagements } from '../api/stakeholders';

export function useStakeholderEngagements() {
  return useQuery({
    queryKey: ['stakeholder-engagements'],
    queryFn: getStakeholderEngagements,
  });
}
