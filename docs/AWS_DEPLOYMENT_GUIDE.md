# HiveTask — Complete AWS Deployment Guide

> A step-by-step guide to deploy HiveTask on AWS. Written for beginners — no prior AWS experience required.

---

## Table of Contents

1. [What You'll Build](#1-what-youll-build)
2. [Prerequisites](#2-prerequisites)
3. [Step 1 — Create an AWS Account](#3-step-1--create-an-aws-account)
4. [Step 2 — Install AWS CLI](#4-step-2--install-aws-cli)
5. [Step 3 — Set Up RDS (PostgreSQL Database)](#5-step-3--set-up-rds-postgresql-database)
6. [Step 4 — Create an S3 Bucket (File Attachments)](#6-step-4--create-an-s3-bucket-file-attachments)
7. [Step 5 — Push Docker Image to ECR](#7-step-5--push-docker-image-to-ecr)
8. [Step 6 — Deploy on ECS Fargate](#8-step-6--deploy-on-ecs-fargate)
9. [Step 7 — Set Up a Load Balancer (ALB)](#9-step-7--set-up-a-load-balancer-alb)
10. [Step 8 — Connect a Domain Name (Optional)](#10-step-8--connect-a-domain-name-optional)
11. [Step 9 — Run Database Migrations & Seed](#11-step-9--run-database-migrations--seed)
12. [Step 10 — Verify Deployment](#12-step-10--verify-deployment)
13. [Cost Estimate](#13-cost-estimate)
14. [Troubleshooting](#14-troubleshooting)
15. [Tear Down (Delete Everything)](#15-tear-down-delete-everything)

---

## 1. What You'll Build

```
┌──────────────┐      ┌──────────────┐      ┌──────────────────┐
│   Browser    │─────▶│   ALB        │─────▶│  ECS Fargate     │
│   (Users)    │      │ (Port 80/443)│      │  (HiveTask App)  │
└──────────────┘      └──────────────┘      │   Port 3000      │
                                            │  Next.js +       │
                                            │  Socket.IO       │
                                            └────────┬─────────┘
                                                     │
                                    ┌────────────────┼────────────────┐
                                    ▼                                 ▼
                           ┌──────────────┐                  ┌──────────────┐
                           │  RDS         │                  │  S3 Bucket   │
                           │  PostgreSQL  │                  │  (Uploads)   │
                           └──────────────┘                  └──────────────┘
```

**Components:**

| AWS Service        | Purpose                           | Why We Need It                      |
|--------------------|-----------------------------------|-------------------------------------|
| **ECR**            | Docker image storage              | Stores our app container image      |
| **ECS Fargate**    | Runs the container                | Serverless — no servers to manage   |
| **ALB**            | Load balancer                     | Routes traffic, handles SSL         |
| **RDS PostgreSQL** | Database                          | Stores users, tasks, lists, etc.    |
| **S3**             | File storage                      | Stores task attachments             |
| **Route 53**       | Domain name (optional)            | Custom domain like hivetask.com     |

---

## 2. Prerequisites

Before you begin, make sure you have:

- [ ] A computer with **Docker** installed ([Install Docker](https://docs.docker.com/get-docker/))
- [ ] **Node.js 20+** installed ([Install Node.js](https://nodejs.org/))
- [ ] **Git** installed
- [ ] A **credit/debit card** (AWS requires one for sign-up, but we'll stay in free tier where possible)
- [ ] The HiveTask source code cloned:
  ```bash
  cd /path/to/hivetask
  ```

---

## 3. Step 1 — Create an AWS Account

If you already have an AWS account, skip to [Step 2](#4-step-2--install-aws-cli).

1. Go to [https://aws.amazon.com/](https://aws.amazon.com/) and click **"Create an AWS Account"**
2. Enter your email, password, and account name
3. Choose **"Personal"** account type
4. Enter payment info (you won't be charged if you stay in free tier)
5. Verify your phone number
6. Select the **"Basic Support — Free"** plan
7. Sign in to the **AWS Management Console**

> **Important:** After sign-up, you're the "root user." We'll create a safer IAM user next.

### Create an IAM User (Recommended)

Using the root account for everything is risky. Let's create a dedicated user:

1. Go to **IAM** service (search "IAM" in the top search bar)
2. Click **"Users"** → **"Create user"**
3. Username: `hivetask-deployer`
4. Check **"Provide user access to the AWS Management Console"**
5. Select **"I want to create an IAM user"**
6. Set a password
7. Click **"Next"**
8. Select **"Attach policies directly"**
9. Search and check these policies:
   - `AmazonECS_FullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `ElasticLoadBalancingFullAccess`
   - `AmazonVPCFullAccess`
   - `CloudWatchLogsFullAccess`
10. Click **"Next"** → **"Create user"**
11. **Save the sign-in URL, username, and password** — you'll need these
12. Click **"Security credentials"** tab → **"Create access key"**
13. Choose **"Command Line Interface (CLI)"**
14. **Save the Access Key ID and Secret Access Key** — you'll need these next

---

## 4. Step 2 — Install AWS CLI

The AWS CLI lets you control AWS from your terminal.

### Linux

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### macOS

```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

### Windows

Download and run: https://awscli.amazonaws.com/AWSCLIV2.msi

### Configure AWS CLI

```bash
aws configure
```

It will ask for four things:

```
AWS Access Key ID: <paste your access key>
AWS Secret Access Key: <paste your secret key>
Default region name: ap-south-1        # Mumbai. Choose your nearest region
Default output format: json
```

> **Choosing a Region:** Pick the one closest to your users.
> - `ap-south-1` = Mumbai, India
> - `us-east-1` = Virginia, USA
> - `eu-west-1` = Ireland, Europe
> - `ap-southeast-1` = Singapore

### Verify it works

```bash
aws sts get-caller-identity
```

You should see your account ID, user ARN, etc. If you see an error, double-check your access keys.

---

## 5. Step 3 — Set Up RDS (PostgreSQL Database)

RDS (Relational Database Service) manages PostgreSQL for you — automatic backups, updates, and monitoring.

### 5.1 Create a Security Group for RDS

A security group is like a firewall — it controls who can connect to your database.

```bash
# Get the default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
echo "VPC ID: $VPC_ID"

# Create security group
RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name hivetask-rds-sg \
  --description "Security group for HiveTask RDS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)
echo "RDS Security Group: $RDS_SG_ID"
```

> **Save this `$RDS_SG_ID`** — you'll need it later. Write it down.

### 5.2 Create the Database

```bash
# Generate a strong password (save this!)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
echo "DB Password: $DB_PASSWORD"
# ⚠️  SAVE THIS PASSWORD SOMEWHERE SAFE!

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier hivetask-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version "15" \
  --master-username postgres \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --db-name hivetask \
  --vpc-security-group-ids $RDS_SG_ID \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-type gp3
```

> **Note:** `db.t3.micro` is eligible for **AWS Free Tier** (750 hours/month for 12 months).

### 5.3 Wait for Database to Be Ready

This takes **5-10 minutes.** Check the status:

```bash
aws rds describe-db-instances \
  --db-instance-identifier hivetask-db \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text
```

Keep running until it says `available`.

### 5.4 Get the Database Endpoint

```bash
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier hivetask-db \
  --query "DBInstances[0].Endpoint.Address" \
  --output text)
echo "RDS Endpoint: $RDS_ENDPOINT"
```

> **Save this endpoint!** Your DATABASE_URL will be:
> `postgresql://postgres:<DB_PASSWORD>@<RDS_ENDPOINT>:5432/hivetask`

---

## 6. Step 4 — Create an S3 Bucket (File Attachments)

S3 stores the files users attach to tasks.

### 6.1 Create the Bucket

```bash
# Replace 'ap-south-1' with your region
aws s3api create-bucket \
  --bucket hivetask-attachments-$(aws sts get-caller-identity --query Account --output text) \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
```

> We append your account ID to the bucket name to make it globally unique.

Save the bucket name:

```bash
S3_BUCKET="hivetask-attachments-$(aws sts get-caller-identity --query Account --output text)"
echo "S3 Bucket: $S3_BUCKET"
```

### 6.2 Block Public Access (Security)

```bash
aws s3api put-public-access-block \
  --bucket $S3_BUCKET \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 6.3 Enable CORS (So the app can upload files)

```bash
aws s3api put-bucket-cors \
  --bucket $S3_BUCKET \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }]
  }'
```

> In production, replace `"AllowedOrigins": ["*"]` with your actual domain like `["https://hivetask.yourdomain.com"]`.

---

## 7. Step 5 — Push Docker Image to ECR

ECR (Elastic Container Registry) is AWS's Docker image storage. We'll build our app image and push it there.

### 7.1 Create an ECR Repository

```bash
aws ecr create-repository \
  --repository-name hivetask \
  --image-scanning-configuration scanOnPush=true
```

### 7.2 Log in to ECR

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="ap-south-1"  # Change to your region

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

You should see: `Login Succeeded`

### 7.3 Build and Push the Docker Image

```bash
cd /path/to/hivetask

# Build the image
docker build -t hivetask .

# Tag it for ECR
docker tag hivetask:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hivetask:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hivetask:latest
```

> This uploads your entire app (Next.js + Socket.IO + Prisma) to AWS. It may take a few minutes on slower connections.

---

## 8. Step 6 — Deploy on ECS Fargate

ECS Fargate runs your Docker container without you having to manage any servers.

### 8.1 Create an ECS Cluster

```bash
aws ecs create-cluster --cluster-name hivetask-cluster
```

### 8.2 Create a CloudWatch Log Group

This is where your app logs will go:

```bash
aws logs create-log-group --log-group-name /ecs/hivetask
```

### 8.3 Create an IAM Role for ECS Tasks

ECS needs permission to pull images, write logs, and access S3:

```bash
# Create the task execution role (lets ECS pull images and write logs)
aws iam create-role \
  --role-name hivetask-ecs-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name hivetask-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create the task role (lets your app access S3)
aws iam create-role \
  --role-name hivetask-ecs-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy \
  --role-name hivetask-ecs-task-role \
  --policy-name hivetask-s3-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::'"$S3_BUCKET"'/*"
    }]
  }'
```

### 8.4 Generate Secrets

```bash
# Generate JWT secrets
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
# ⚠️  SAVE THESE!
```

### 8.5 Create a Security Group for ECS

```bash
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name hivetask-ecs-sg \
  --description "Security group for HiveTask ECS tasks" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)
echo "ECS Security Group: $ECS_SG_ID"

# Allow inbound on port 3000 from anywhere (ALB will route here)
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp --port 3000 --cidr 0.0.0.0/0
```

### 8.6 Allow ECS to Connect to RDS

```bash
# Allow the ECS security group to talk to the RDS security group on port 5432
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp --port 5432 --source-group $ECS_SG_ID
```

### 8.7 Create the Task Definition

This tells ECS how to run your container — what image, how much CPU/memory, environment variables, etc.

Create a file called `task-definition.json`:

```bash
cat > task-definition.json << 'TASKDEF'
{
  "family": "hivetask",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/hivetask-ecs-execution-role",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/hivetask-ecs-task-role",
  "containerDefinitions": [
    {
      "name": "hivetask",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/hivetask:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DATABASE_URL", "value": "postgresql://postgres:DB_PASSWORD@RDS_ENDPOINT:5432/hivetask"},
        {"name": "JWT_SECRET", "value": "JWT_SECRET_VALUE"},
        {"name": "JWT_REFRESH_SECRET", "value": "JWT_REFRESH_VALUE"},
        {"name": "NEXT_PUBLIC_APP_URL", "value": "http://ALB_DNS_NAME"},
        {"name": "NEXT_PUBLIC_WS_URL", "value": "ws://ALB_DNS_NAME"},
        {"name": "AWS_REGION", "value": "REGION"},
        {"name": "AWS_S3_BUCKET", "value": "S3_BUCKET_NAME"},
        {"name": "E2E_ENABLED", "value": "true"},
        {"name": "SESSION_IDLE_TIMEOUT", "value": "900"},
        {"name": "SESSION_ABSOLUTE_TIMEOUT", "value": "28800"},
        {"name": "RATE_LIMIT_GENERAL", "value": "100"},
        {"name": "RATE_LIMIT_AUTH", "value": "5"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hivetask",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -q -O /dev/null http://localhost:3000/api/auth/me || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
TASKDEF
```

Now replace the placeholders with your actual values:

```bash
sed -i "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" task-definition.json
sed -i "s/REGION/$AWS_REGION/g" task-definition.json
sed -i "s/DB_PASSWORD/$DB_PASSWORD/g" task-definition.json
sed -i "s/RDS_ENDPOINT/$RDS_ENDPOINT/g" task-definition.json
sed -i "s/JWT_SECRET_VALUE/$JWT_SECRET/g" task-definition.json
sed -i "s/JWT_REFRESH_VALUE/$JWT_REFRESH_SECRET/g" task-definition.json
sed -i "s/S3_BUCKET_NAME/$S3_BUCKET/g" task-definition.json
```

> **Note:** We'll update `ALB_DNS_NAME` after creating the load balancer in the next step.

Register the task definition:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 8.8 Get Subnet IDs

ECS needs to know which subnets (network zones) to run in:

```bash
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" --output text | tr '\t' ',')
echo "Subnets: $SUBNET_IDS"
```

---

## 9. Step 7 — Set Up a Load Balancer (ALB)

The ALB (Application Load Balancer) sits in front of your app. It routes HTTP/WebSocket traffic to your ECS containers.

### 9.1 Create a Security Group for ALB

```bash
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name hivetask-alb-sg \
  --description "Security group for HiveTask ALB" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)
echo "ALB Security Group: $ALB_SG_ID"

# Allow HTTP (port 80) from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# Allow HTTPS (port 443) from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

### 9.2 Update ECS Security Group

Only allow traffic from the ALB (not from the whole internet):

```bash
# Revoke the wide-open rule we added earlier
aws ec2 revoke-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp --port 3000 --cidr 0.0.0.0/0

# Allow traffic only from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp --port 3000 --source-group $ALB_SG_ID
```

### 9.3 Create the ALB

```bash
# Need at least 2 subnets in different AZs
SUBNET_LIST=$(echo $SUBNET_IDS | tr ',' ' ')

ALB_ARN=$(aws elbv2 create-load-balancer \
  --name hivetask-alb \
  --subnets $SUBNET_LIST \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)
echo "ALB ARN: $ALB_ARN"

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' --output text)
echo "ALB DNS: $ALB_DNS"
```

> **Save `$ALB_DNS`** — this is your app's public URL (e.g., `http://hivetask-alb-123456.ap-south-1.elb.amazonaws.com`).

### 9.4 Create a Target Group

The target group tells the ALB where to send traffic:

```bash
TG_ARN=$(aws elbv2 create-target-group \
  --name hivetask-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path "/api/auth/me" \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' --output text)
echo "Target Group ARN: $TG_ARN"
```

#### Enable Sticky Sessions (Required for Socket.IO)

Socket.IO needs WebSocket connections to stay with the same container:

```bash
aws elbv2 modify-target-group-attributes \
  --target-group-arn $TG_ARN \
  --attributes Key=stickiness.enabled,Value=true Key=stickiness.type,Value=lb_cookie Key=stickiness.lb_cookie.duration_seconds,Value=86400
```

### 9.5 Create a Listener

```bash
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

### 9.6 Update Task Definition with ALB DNS

Now we know the ALB DNS, update the task definition:

```bash
sed -i "s/ALB_DNS_NAME/$ALB_DNS/g" task-definition.json

# Re-register with updated URLs
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 9.7 Create the ECS Service

```bash
# Convert comma-separated subnets to the format ECS expects
SUBNET_ARR=$(echo $SUBNET_IDS | sed 's/,/","/g')

aws ecs create-service \
  --cluster hivetask-cluster \
  --service-name hivetask-service \
  --task-definition hivetask \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ARR],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=hivetask,containerPort=3000"
```

> **What this does:** Starts 1 container running HiveTask, connected to the ALB, in your VPC.

### 9.8 Wait for Service to Stabilize

```bash
aws ecs wait services-stable \
  --cluster hivetask-cluster \
  --services hivetask-service
echo "Service is running!"
```

This may take **2-5 minutes**. If it times out, check the logs:

```bash
aws logs tail /ecs/hivetask --since 10m
```

---

## 10. Step 8 — Connect a Domain Name (Optional)

If you have a domain name and want to use HTTPS:

### 10.1 Request an SSL Certificate

```bash
aws acm request-certificate \
  --domain-name hivetask.yourdomain.com \
  --validation-method DNS
```

Follow the instructions to add a DNS record for validation. After validation:

### 10.2 Add HTTPS Listener to ALB

```bash
CERT_ARN="arn:aws:acm:REGION:ACCOUNT_ID:certificate/xxxxx"

aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

### 10.3 Redirect HTTP to HTTPS

```bash
# Get the HTTP listener ARN
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --query "Listeners[?Port==\`80\`].ListenerArn" --output text)

aws elbv2 modify-listener \
  --listener-arn $HTTP_LISTENER_ARN \
  --default-actions '[{
    "Type": "redirect",
    "RedirectConfig": {
      "Protocol": "HTTPS",
      "Port": "443",
      "StatusCode": "HTTP_301"
    }
  }]'
```

### 10.4 Point Your Domain to ALB

In your domain registrar (GoDaddy, Namecheap, etc.), add a **CNAME** record:

```
Type:  CNAME
Name:  hivetask              (or @ for root domain)
Value: hivetask-alb-xxxxx.ap-south-1.elb.amazonaws.com
```

Then update the task definition's `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_WS_URL`:

```bash
# Update to use your domain
sed -i 's|http://'"$ALB_DNS"'|https://hivetask.yourdomain.com|g' task-definition.json
sed -i 's|ws://'"$ALB_DNS"'|wss://hivetask.yourdomain.com|g' task-definition.json

# Re-register and force new deployment
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs update-service \
  --cluster hivetask-cluster \
  --service hivetask-service \
  --task-definition hivetask \
  --force-new-deployment
```

---

## 11. Step 9 — Run Database Migrations & Seed

The container's CMD already runs `prisma migrate deploy` on startup, so migrations happen automatically. But the **first time**, you need to seed the database with the default users.

### 11.1 Run the Seed Command

The easiest way is to use ECS Exec to get a shell inside your running container:

```bash
# Enable ECS Exec on the service (one-time)
aws ecs update-service \
  --cluster hivetask-cluster \
  --service hivetask-service \
  --enable-execute-command \
  --force-new-deployment

# Wait for the new deployment
aws ecs wait services-stable --cluster hivetask-cluster --services hivetask-service

# Get the running task ID
TASK_ID=$(aws ecs list-tasks \
  --cluster hivetask-cluster \
  --service-name hivetask-service \
  --query 'taskArns[0]' --output text | awk -F'/' '{print $NF}')

echo "Task ID: $TASK_ID"

# Run the seed command inside the container
aws ecs execute-command \
  --cluster hivetask-cluster \
  --task $TASK_ID \
  --container hivetask \
  --interactive \
  --command "npx prisma db seed"
```

> **Note:** If `execute-command` fails, you may need to install the Session Manager plugin:
> https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

### Default Users (After Seeding)

| Email                  | Password      |
|------------------------|---------------|
| alice@hivetask.com     | changeme123   |
| bob@hivetask.com       | changeme123   |
| carol@hivetask.com     | changeme123   |
| dave@hivetask.com      | changeme123   |
| eve@hivetask.com       | changeme123   |

---

## 12. Step 10 — Verify Deployment

### Check in Browser

Open your ALB DNS name (or custom domain) in a browser:

```
http://hivetask-alb-xxxxx.ap-south-1.elb.amazonaws.com
```

You should see the HiveTask login page.

### Quick Checks

```bash
# Check ECS service is running
aws ecs describe-services \
  --cluster hivetask-cluster \
  --services hivetask-service \
  --query "services[0].{Status:status,Running:runningCount,Desired:desiredCount}"

# Check recent logs
aws logs tail /ecs/hivetask --since 5m --format short

# Check ALB health
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN
```

### Verify Each Feature

1. **Login** — Sign in with `alice@hivetask.com` / `changeme123`
2. **Task Lists** — You should see a "Welcome Board"
3. **Create Task** — Add a new task, verify it appears
4. **Board/List/Calendar Views** — Toggle between views
5. **WebSocket** — Open another browser tab as Bob, changes should sync in real-time
6. **File Upload** — Attach a file to a task (tests S3)
7. **PWA** — On mobile Chrome, you should see "Add to Home Screen" option

---

## 13. Cost Estimate

For a small team (~5 users), monthly costs stay very low:

| Service          | Spec                  | Estimated Cost   |
|------------------|-----------------------|------------------|
| ECS Fargate      | 0.5 vCPU, 1 GB RAM   | ~$15/month       |
| RDS PostgreSQL   | db.t3.micro, 20 GB    | Free tier* / ~$15|
| S3               | < 1 GB storage        | < $1/month       |
| ALB              | Application LB        | ~$16/month       |
| Data transfer    | < 10 GB               | < $1/month       |
| CloudWatch Logs  | Minimal               | < $1/month       |
| **Total**        |                       | **~$33-48/month**|

> \* RDS db.t3.micro is free for 12 months on new AWS accounts.

### Ways to Save

- Use **t3.micro** for RDS (free tier eligible)
- Set `desired-count` to `0` when not using the app (stops ECS charges)
- Use a single AZ for the ALB if high availability isn't critical

---

## 14. Troubleshooting

### Container won't start

```bash
# Check ECS events
aws ecs describe-services \
  --cluster hivetask-cluster \
  --services hivetask-service \
  --query "services[0].events[:5]"

# Check container logs
aws logs tail /ecs/hivetask --since 30m
```

**Common issues:**
- `"Unable to connect to database"` — RDS security group doesn't allow ECS. Re-run step 8.6.
- `"ECONNREFUSED 5432"` — DATABASE_URL is wrong. Check the RDS endpoint.
- `"Cannot find module"` — Docker build issue. Rebuild and push the image.

### Can't access the app in browser

```bash
# Check ALB target health
aws elbv2 describe-target-health --target-group-arn $TG_ARN
```

If targets show `unhealthy`:
- The health check path `/api/auth/me` returns 401 for unauthenticated requests — this is **expected**. Change health check to return any 2xx/3xx:

```bash
aws elbv2 modify-target-group \
  --target-group-arn $TG_ARN \
  --health-check-path "/" \
  --matcher HttpCode=200-399
```

### Database migration fails

```bash
# Connect to the container and run manually
aws ecs execute-command \
  --cluster hivetask-cluster \
  --task $TASK_ID \
  --container hivetask \
  --interactive \
  --command "sh"

# Inside the container:
npx prisma migrate deploy
npx prisma db seed
```

### WebSocket / Socket.IO not connecting

- Make sure ALB has **sticky sessions** enabled (step 9.4)
- Check `NEXT_PUBLIC_WS_URL` matches the ALB DNS or your domain
- If using HTTPS, `NEXT_PUBLIC_WS_URL` should be `wss://` (not `ws://`)

### Redeploying After Code Changes

```bash
# Build, tag, push new image
docker build -t hivetask .
docker tag hivetask:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hivetask:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hivetask:latest

# Force ECS to pull the new image
aws ecs update-service \
  --cluster hivetask-cluster \
  --service hivetask-service \
  --force-new-deployment
```

---

## 15. Tear Down (Delete Everything)

If you want to remove everything to stop charges:

```bash
# 1. Delete ECS Service
aws ecs update-service --cluster hivetask-cluster --service hivetask-service --desired-count 0
aws ecs delete-service --cluster hivetask-cluster --service hivetask-service --force

# 2. Delete ECS Cluster
aws ecs delete-cluster --cluster hivetask-cluster

# 3. Delete ALB
aws elbv2 delete-listener --listener-arn $HTTP_LISTENER_ARN
aws elbv2 delete-target-group --target-group-arn $TG_ARN
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN

# 4. Delete RDS (takes a few minutes)
aws rds delete-db-instance \
  --db-instance-identifier hivetask-db \
  --skip-final-snapshot

# 5. Delete S3 Bucket (must be empty first)
aws s3 rm s3://$S3_BUCKET --recursive
aws s3api delete-bucket --bucket $S3_BUCKET

# 6. Delete ECR Repository
aws ecr delete-repository --repository-name hivetask --force

# 7. Delete Security Groups
aws ec2 delete-security-group --group-id $ECS_SG_ID
aws ec2 delete-security-group --group-id $ALB_SG_ID
aws ec2 delete-security-group --group-id $RDS_SG_ID

# 8. Delete IAM Roles
aws iam delete-role-policy --role-name hivetask-ecs-task-role --policy-name hivetask-s3-access
aws iam detach-role-policy --role-name hivetask-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
aws iam delete-role --role-name hivetask-ecs-task-role
aws iam delete-role --role-name hivetask-ecs-execution-role

# 9. Delete Log Group
aws logs delete-log-group --log-group-name /ecs/hivetask

# 10. Deregister Task Definitions
aws ecs deregister-task-definition --task-definition hivetask:1
```

---

## Quick Reference — All Your Saved Values

Keep this filled in as you go through the guide:

```
VPC_ID            = vpc-xxxxxxxxx
RDS_SG_ID         = sg-xxxxxxxxx
ECS_SG_ID         = sg-xxxxxxxxx
ALB_SG_ID         = sg-xxxxxxxxx
DB_PASSWORD       = xxxxxxxx
RDS_ENDPOINT      = hivetask-db.xxxxx.ap-south-1.rds.amazonaws.com
S3_BUCKET         = hivetask-attachments-xxxxxxxxxxxx
AWS_ACCOUNT_ID    = xxxxxxxxxxxx
AWS_REGION        = ap-south-1
ALB_ARN           = arn:aws:elasticloadbalancing:...
ALB_DNS           = hivetask-alb-xxxxx.ap-south-1.elb.amazonaws.com
TG_ARN            = arn:aws:elasticloadbalancing:...
JWT_SECRET        = xxxxxxxx
JWT_REFRESH_SECRET= xxxxxxxx
```

---

**Congratulations!** HiveTask is now running on AWS. Your team can access it at the ALB DNS name (or your custom domain).
