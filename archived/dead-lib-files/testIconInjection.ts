import { injectAWSIconsFromCodeSync } from './iconInjector';

// Test the icon injection function
const testCode = `flowchart
    n1["example"]
    n1@{ icon: "aws:storage-storage-s3" }
    n2["EC2 Instance"]@{ icon: "aws:compute-compute-ec2" }
    n3["Lambda"]@{ icon: "aws:compute-lambda" }
    n1 --> n2
    n2 --> n3`;

const result = injectAWSIconsFromCodeSync(testCode);
console.log('Original code:', testCode);
console.log('Processed code:', result);

export { result, testCode };
