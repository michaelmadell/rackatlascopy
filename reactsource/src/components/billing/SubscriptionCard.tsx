import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@patchdocs/ui';

export default function SubscriptionCard({ customer, billingStatus, onOpenSubscribeDialog }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-[#f4f4f5]">{customer?.billing?.plan || 'Free'} Plan</div>
            <div className="text-xs text-[#a1a1aa]">Status: {billingStatus || 'Active'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
