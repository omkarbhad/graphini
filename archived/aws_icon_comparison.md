# AWS Icon Collection Comparison Report

## Summary

- **Static AWS Icons**: 311 icons
- **Eraser Icons**: 441 AWS-related icons
- **Missing from Eraser**: 20 icons
- **Extra in Eraser**: 150 icons

## Icons Missing from Eraser Collection

The following 20 AWS icons from the static collection are missing from eraser-icons:

| Icon Name                | Category                    | Static Path                                        |
| ------------------------ | --------------------------- | -------------------------------------------------- |
| analytics-athena         | analytics                   | analytics/analytics-athena.svg                     |
| analytics-kinesis        | analytics                   | analytics/analytics-kinesis.svg                    |
| analytics-opensearch     | analytics                   | analytics/analytics-opensearch.svg                 |
| application-auto-scaling | compute                     | compute/application-auto-scaling.svg               |
| application-composer     | management-governance       | management-governance/application-composer.svg     |
| cloud-directory          | database                    | database/cloud-directory.svg                       |
| compute-ec2              | compute                     | compute/compute-ec2.svg                            |
| database-dynamodb        | database                    | database/database-dynamodb.svg                     |
| database-rds             | database                    | database/database-rds.svg                          |
| fargate                  | compute                     | compute/fargate.svg                                |
| integration-sns          | app-integration             | app-integration/integration-sns.svg                |
| integration-sqs          | app-integration             | app-integration/integration-sqs.svg                |
| kinesis-video-streams    | analytics                   | analytics/kinesis-video-streams.svg                |
| lumberyard               | games                       | games/lumberyard.svg                               |
| management-cloudwatch    | management-governance       | management-governance/management-cloudwatch.svg    |
| media-mediaconvert       | media-services              | media-services/media-mediaconvert.svg              |
| network-cloudfront       | networking-content-delivery | networking-content-delivery/network-cloudfront.svg |
| network-elb              | networking-content-delivery | networking-content-delivery/network-elb.svg        |
| omics                    | analytics                   | analytics/omics.svg                                |
| storage-s3               | storage                     | storage/storage-s3.svg                             |

## Analysis

### Missing Core AWS Services

Some critical AWS services are missing:

- **EC2** (compute-ec2) - Core compute service
- **S3** (storage-s3) - Core storage service
- **RDS** (database-rds) - Core database service
- **DynamoDB** (database-dynamodb) - NoSQL database
- **CloudWatch** (management-cloudwatch) - Monitoring service
- **CloudFront** (network-cloudfront) - CDN service
- **ELB** (network-elb) - Load balancing

### Naming Convention Differences

- Static icons use category prefixes (e.g., `analytics/analytics-athena`)
- Eraser icons use `aws-` prefix (e.g., `aws-athena`)
- Some services have different naming conventions

### Recommendations

1. **Add missing core services** - Priority for EC2, S3, RDS, DynamoDB, CloudWatch
2. **Standardize naming** - Consider consistent naming convention
3. **Audit extra icons** - Review if 150 extra icons are needed or duplicates

## Commands Used

```bash
# Find missing icons
find static/icons/aws -name "*.svg" | sed 's|.*aws/||' | sed 's|\.svg$||' | sort > /tmp/aws_static_icons.txt
find eraser-icons/canvas-icons -name "*aws*.svg" | sed 's|.*canvas-icons/||' | sed 's|\.svg$||' | sort > /tmp/aws_eraser_icons.txt
comm -23 /tmp/aws_static_normalized.txt /tmp/aws_eraser_normalized.txt > /tmp/missing_from_eraser.txt
```
