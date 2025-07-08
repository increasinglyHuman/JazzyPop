#!/usr/bin/env python3
"""
Check AWS SES verification status for p0qp0q.com
"""

import boto3
import json
from datetime import datetime

def check_ses_status():
    """Check SES domain and email verification status"""
    
    # Create SES client for us-west-2 (Oregon)
    ses = boto3.client('ses', region_name='us-west-2')
    
    print("=" * 60)
    print("AWS SES Status Check")
    print("=" * 60)
    print(f"Time: {datetime.now()}")
    print(f"Region: us-west-2 (Oregon)")
    print()
    
    try:
        # Check verified identities
        print("📧 Checking Verified Identities...")
        print("-" * 40)
        
        # Get all verified identities
        response = ses.list_verified_email_addresses()
        verified_emails = response.get('VerifiedEmailAddresses', [])
        
        if verified_emails:
            print("\n✅ Verified Email Addresses:")
            for email in verified_emails:
                print(f"   - {email}")
        else:
            print("\n❌ No verified email addresses found")
        
        # Check domain identities
        domain_response = ses.list_identities(IdentityType='Domain')
        domains = domain_response.get('Identities', [])
        
        if domains:
            print("\n📋 Domain Identities:")
            for domain in domains:
                # Get detailed info about each domain
                attrs = ses.get_identity_verification_attributes(Identities=[domain])
                domain_info = attrs['VerificationAttributes'].get(domain, {})
                
                status = domain_info.get('VerificationStatus', 'Unknown')
                
                print(f"\n   Domain: {domain}")
                print(f"   Status: {status}")
                
                if status == 'Success':
                    print(f"   ✅ Domain is verified!")
                    
                    # Check DKIM status
                    dkim_attrs = ses.get_identity_dkim_attributes(Identities=[domain])
                    dkim_info = dkim_attrs['DkimAttributes'].get(domain, {})
                    
                    if dkim_info.get('DkimEnabled'):
                        if dkim_info.get('DkimVerificationStatus') == 'Success':
                            print(f"   ✅ DKIM is verified!")
                        else:
                            print(f"   ⏳ DKIM status: {dkim_info.get('DkimVerificationStatus', 'Pending')}")
                elif status == 'Pending':
                    print(f"   ⏳ Verification pending - DNS records still propagating")
                else:
                    print(f"   ❌ Verification failed or not started")
        
        # Check sending quota (sandbox vs production)
        print("\n📊 Sending Quota:")
        print("-" * 40)
        
        quota = ses.get_send_quota()
        max_send = quota.get('Max24HourSend', 0)
        sent_last_24h = quota.get('SentLast24Hours', 0)
        send_rate = quota.get('MaxSendRate', 0)
        
        print(f"   Max emails per 24 hours: {max_send}")
        print(f"   Emails sent in last 24h: {sent_last_24h}")
        print(f"   Max send rate: {send_rate} emails/second")
        
        if max_send <= 200:
            print("\n⚠️  You are still in SANDBOX mode!")
            print("   - Can only send to verified emails")
            print("   - Limited to 200 emails/day")
            print("   - Request production access in SES console")
        else:
            print("\n✅ Production access granted!")
            print("   - Can send to any email address")
            print(f"   - Daily limit: {max_send} emails")
        
        # Check if we can send a test
        if 'p0qp0q.com' in domains:
            domain_verified = attrs['VerificationAttributes'].get('p0qp0q.com', {}).get('VerificationStatus') == 'Success'
            if domain_verified:
                print("\n🚀 Ready to send emails from p0qp0q.com!")
            else:
                print("\n⏳ Waiting for p0qp0q.com verification...")
                print("   DNS records can take 15-30 minutes to propagate")
                print("   Sometimes up to 72 hours")
        
    except Exception as e:
        print(f"\n❌ Error checking SES status: {e}")
        print("\nPossible issues:")
        print("- AWS credentials not configured")
        print("- Wrong region (should be us-west-2)")
        print("- No SES access permissions")

if __name__ == "__main__":
    check_ses_status()