/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.ranger.authorization.hbase;

import java.util.Collection;
import java.util.List;

import org.apache.ranger.audit.model.AuthzAuditEvent;
import org.apache.ranger.plugin.policyengine.RangerAccessResultProcessor;

public interface HbaseAuditHandler extends RangerAccessResultProcessor {

	List<AuthzAuditEvent> getCapturedEvents();
	
	void logAuthzAudits(Collection<AuthzAuditEvent> auditEvents);
	
	/**
	 * Discards and returns the last audit events captured by the audit handler.  Last audit event should be the ones generated during the most recent authorization request.
	 * However, it won't be all of the audit events called during an authorize call since implementation class may not override the method which takes a list of responses -- in 
	 * which case there would be several audit messages generated by one call but this only allows you to get last of those messages created during single auth request.
	 * After this call the last set of audit events won't be returned by <code>getCapturedEvents</code>. 
	 * @return
	 */
	AuthzAuditEvent getAndDiscardMostRecentEvent();
	
	/**
	 * This is a complement to <code>getAndDiscardMostRecentEvent</code> to set the most recent events.  Often useful to un-pop audit messages that were take out.
	 * @param capturedEvents
	 */
	void setMostRecentEvent(AuthzAuditEvent capturedEvents);
	
	/**
	 * Is audit handler being used in context of a access authorization of a superuser?
	 * @param override
	 */
	void setSuperUserOverride(boolean override);
}
