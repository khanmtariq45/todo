Explain while we are getting innerexception of ae which is ex does we still need to check ex.innerexception ? and which approach is benfit for parallel processing explain with reason 


catch (AggregateException ae)
{
    foreach (var ex in ae.Flatten().InnerExceptions)
    {
        UDFLib.WriteExceptionLog(new Exception("QMS SaveFolderVesselAssignments assignReq: With exception: " + ex + " Exception Message: " + ex.Message + " Inner Exception: " + ex.InnerException +
            " Inner Exception Message: " + (ex.InnerException != null ? ex.InnerException.Message : "None")));
    }
}


 catch (AggregateException ae)
                            {
                                foreach (var ex in ae.InnerExceptions)
                                {
                                    UDFLib.WriteExceptionLog(new Exception("QMS SaveFolderVesselAssignments AggregateException : With exception: " + ex + " Exception Message: " + ex.Message + " Inner Exception: " + ex.InnerException +
                                        " Inner Exception Message: " + (ex.InnerException != null ? ex.InnerException.Message : "None" + "Parallel processing error for request: " + req.Uid)));
                                }
                            }
