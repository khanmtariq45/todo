catch (AggregateException ae)
{
    foreach (var ex in ae.Flatten().InnerExceptions)
    {
        UDFLib.WriteExceptionLog(new Exception(
            "QMS SaveFolderVesselAssignments encountered an error. " +
            "Exception: " + ex + 
            " Message: " + ex.Message + 
            " Inner Exception: " + ex.InnerException + 
            " Inner Exception Message: " + (ex.InnerException != null ? ex.InnerException.Message : "None")
        ));
    }
}