const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
const winston = require('winston');

// configure winston logging
const logger = winston.createLogger({
  level: 'info', 
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),  // Log to console
    new winston.transports.File({ filename: 'logs/server.log', format: winston.format.simple() })  // Log to file
  ]
});


app.use(cors());

// Enable JSON parsing
app.use(express.json());

// Function to fetch job data using the jobPostingId
async function getJobData(jobPostingId) {

  try {
    const payload = {
      operationName: "ApiJobPosting",
      variables: {
        organizationHostedJobsPageName: "cohere",
        jobPostingId: jobPostingId
      },
      query: `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
        jobPosting(
          organizationHostedJobsPageName: $organizationHostedJobsPageName
          jobPostingId: $jobPostingId
        ) {
          title
          locationName
          workplaceType
          employmentType
          descriptionHtml  # Add this line to include descriptionHtml
          __typename
        }
      }`
    };

    logger.info(`Fetching job data for jobPostingId: ${jobPostingId}`);

    const response = await axios.post(
      'https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting',
      payload
    );

    const jobPosting = response.data.data.jobPosting;

    if (!jobPosting) {
      logger.error("Job posting not found.");
      return null;
    }

    const jobData = {
      title: jobPosting.title,
      locationName: jobPosting.locationName,
      workplaceType: jobPosting.workplaceType,
      employmentType: jobPosting.employmentType,
      descriptionHtml: jobPosting.descriptionHtml
    };

    logger.info(`Job data fetched successfully: ${JSON.stringify(jobData, null, 2)}`);

    return jobData;

  } catch (error) {
    logger.error("Error fetching job data:", error);
    if (error.response) {
      logger.error("Response data:", error.response.data);
      logger.error("Response status:", error.response.status);
      logger.error("Response headers:", error.response.headers);
    } else if (error.request) {
      logger.error("Request error:", error.request);
    } else {
      logger.error("Error message:", error.message);
    }
    return null;
  }
}

app.get('/api/fetch-data', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const jobIdMatch = url.match(/\/([^\/]+)$/);
    if (!jobIdMatch || jobIdMatch.length < 2) {
      return res.status(400).json({ error: 'Invalid URL format, unable to extract jobId' });
    }

    const jobId = jobIdMatch[1];
    logger.log("JobId: ", jobId);

    const jobData = await getJobData(jobId);

    if (!jobData) {
      return res.status(404).json({ error: 'Job data not found' });
    }

    res.json(jobData);

  } catch (error) {
    logger.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data from the URL' });
  }
});

// Start the Express server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
