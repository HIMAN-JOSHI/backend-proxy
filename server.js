const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');

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

    const response = await axios.post(
      'https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting',
      payload
    );

    const jobPosting = response.data.data.jobPosting;

    if (!jobPosting) {
      console.error("Job posting not found.");
      return null;
    }

    const jobData = {
      title: jobPosting.title,
      locationName: jobPosting.locationName,
      workplaceType: jobPosting.workplaceType,
      employmentType: jobPosting.employmentType,
      descriptionHtml: jobPosting.descriptionHtml
    };

    console.log(JSON.stringify(jobData, null, 2));

    return jobData;

  } catch (error) {
    console.error("Error fetching job data:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      console.error("Request error:", error.request);
    } else {
      console.error("Error message:", error.message);
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
    console.log("JobId: ", jobId);

    const jobData = await getJobData(jobId);

    if (!jobData) {
      return res.status(404).json({ error: 'Job data not found' });
    }

    res.json(jobData);

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data from the URL' });
  }
});

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
