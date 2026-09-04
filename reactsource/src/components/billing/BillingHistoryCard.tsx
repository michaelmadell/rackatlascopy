import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@patchdocs/ui';

export default function BillingHistoryCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices & History</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-[#a1a1aa]">
        No previous invoices.
      </CardContent>
    </Card>
  );
}
