pipeline {
  agent any

  environment {
    CI = 'true'
    NEXT_TELEMETRY_DISABLED = '1'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }

    stage('Typecheck') {
      steps {
        sh 'npm run typecheck'
      }
    }

    stage('Unit Tests') {
      steps {
        sh 'npm run test'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('E2E Tests') {
      steps {
        sh 'npx playwright install --with-deps chromium'
        sh 'npm run test:e2e'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
      archiveArtifacts artifacts: '.next/**', allowEmptyArchive: true
    }
    failure {
      echo 'Le pipeline a échoué.'
    }
    success {
      echo 'Le pipeline a réussi.'
    }
  }
}